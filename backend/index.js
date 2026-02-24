const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  BedrockRuntimeClient,
  ConverseCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const { v4: uuidv4 } = require("uuid");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || "us-east-1",
});

const PROJECTS_TABLE = process.env.PROJECTS_TABLE || "chunked-projects";
const TASKS_TABLE = process.env.TASKS_TABLE || "chunked-tasks";
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Content-Type": "application/json",
};

const res = (status, body) => ({
  statusCode: status,
  headers: CORS,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const method = event.httpMethod;
  const resource = event.resource;
  const params = event.pathParameters || {};
  let body = {};

  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return res(400, { error: "Invalid JSON body" });
  }

  if (method === "OPTIONS") return res(200, {});

  try {
    switch (`${method} ${resource}`) {
      // ── Projects ────────────────────────────────────────────────

      case "GET /projects": {
        const result = await dynamo.send(
          new ScanCommand({ TableName: PROJECTS_TABLE })
        );
        const projects = (result.Items || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        return res(200, projects);
      }

      case "POST /projects": {
        if (!body.name || !body.reminder)
          return res(400, { error: "name and reminder are required" });
        const project = {
          projectId: uuidv4(),
          name: body.name,
          reminder: body.reminder,
          createdAt: new Date().toISOString(),
        };
        await dynamo.send(
          new PutCommand({ TableName: PROJECTS_TABLE, Item: project })
        );
        return res(201, project);
      }

      case "DELETE /projects/{projectId}": {
        await dynamo.send(
          new DeleteCommand({
            TableName: PROJECTS_TABLE,
            Key: { projectId: params.projectId },
          })
        );
        // Clean up all tasks belonging to this project
        const tasks = await dynamo.send(
          new QueryCommand({
            TableName: TASKS_TABLE,
            IndexName: "projectId-index",
            KeyConditionExpression: "projectId = :pid",
            ExpressionAttributeValues: { ":pid": params.projectId },
          })
        );
        for (const task of tasks.Items || []) {
          await dynamo.send(
            new DeleteCommand({
              TableName: TASKS_TABLE,
              Key: { taskId: task.taskId },
            })
          );
        }
        return res(200, { message: "Project deleted" });
      }

      // ── Tasks ───────────────────────────────────────────────────

      case "GET /projects/{projectId}/tasks": {
        const result = await dynamo.send(
          new QueryCommand({
            TableName: TASKS_TABLE,
            IndexName: "projectId-index",
            KeyConditionExpression: "projectId = :pid",
            ExpressionAttributeValues: { ":pid": params.projectId },
          })
        );
        const tasks = (result.Items || []).sort((a, b) => a.order - b.order);
        return res(200, tasks);
      }

      case "POST /projects/{projectId}/tasks": {
        if (!body.name) return res(400, { error: "name is required" });
        const existing = await dynamo.send(
          new QueryCommand({
            TableName: TASKS_TABLE,
            IndexName: "projectId-index",
            KeyConditionExpression: "projectId = :pid",
            ExpressionAttributeValues: { ":pid": params.projectId },
            Select: "COUNT",
          })
        );
        const task = {
          taskId: uuidv4(),
          projectId: params.projectId,
          name: body.name,
          order: (existing.Count || 0) + 1,
          chunks: [],
          createdAt: new Date().toISOString(),
        };
        await dynamo.send(
          new PutCommand({ TableName: TASKS_TABLE, Item: task })
        );
        return res(201, task);
      }

      case "PATCH /tasks/{taskId}": {
        if (!body.name) return res(400, { error: "name is required" });
        const taskResult = await dynamo.send(
          new GetCommand({ TableName: TASKS_TABLE, Key: { taskId: params.taskId } })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;
        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET #n = :name",
            ExpressionAttributeNames: { "#n": "name" },
            ExpressionAttributeValues: { ":name": body.name },
          })
        );
        return res(200, { ...task, name: body.name });
      }

      case "DELETE /tasks/{taskId}": {
        await dynamo.send(
          new DeleteCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
          })
        );
        return res(200, { message: "Task deleted" });
      }

      case "PUT /tasks/{taskId}/chunks": {
        if (!Array.isArray(body.chunkIds)) return res(400, { error: "chunkIds array required" });
        const taskResult = await dynamo.send(
          new GetCommand({ TableName: TASKS_TABLE, Key: { taskId: params.taskId } })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;
        const chunkMap = Object.fromEntries((task.chunks || []).map((c) => [c.chunkId, c]));
        const reordered = body.chunkIds
          .filter((id) => chunkMap[id])
          .map((id, i) => ({ ...chunkMap[id], order: i + 1 }));
        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET chunks = :chunks",
            ExpressionAttributeValues: { ":chunks": reordered },
          })
        );
        return res(200, { ...task, chunks: reordered });
      }

      case "POST /tasks/{taskId}/chunks": {
        if (!body.title) return res(400, { error: "title is required" });
        const taskResult = await dynamo.send(
          new GetCommand({ TableName: TASKS_TABLE, Key: { taskId: params.taskId } })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;
        const chunks = task.chunks || [];
        const maxOrder = chunks.reduce((max, c) => Math.max(max, c.order || 0), 0);
        const newChunk = {
          chunkId: uuidv4(),
          order: maxOrder + 1,
          title: body.title,
          description: body.description || "",
          completed: false,
        };
        const updatedChunks = [...chunks, newChunk];
        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET chunks = :chunks",
            ExpressionAttributeValues: { ":chunks": updatedChunks },
          })
        );
        return res(200, { ...task, chunks: updatedChunks });
      }

      case "DELETE /tasks/{taskId}/chunks/{chunkId}": {
        const taskResult = await dynamo.send(
          new GetCommand({ TableName: TASKS_TABLE, Key: { taskId: params.taskId } })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;
        const filtered = (task.chunks || []).filter((c) => c.chunkId !== params.chunkId);
        const renumbered = filtered.map((c, i) => ({ ...c, order: i + 1 }));
        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET chunks = :chunks",
            ExpressionAttributeValues: { ":chunks": renumbered },
          })
        );
        return res(200, { ...task, chunks: renumbered });
      }

      // ── AI Breakdown ────────────────────────────────────────────

      case "POST /tasks/{taskId}/breakdown": {
        const taskResult = await dynamo.send(
          new GetCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
          })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;

        const projectResult = await dynamo.send(
          new GetCommand({
            TableName: PROJECTS_TABLE,
            Key: { projectId: task.projectId },
          })
        );
        if (!projectResult.Item) return res(404, { error: "Project not found" });
        const project = projectResult.Item;

        const prompt = `You are a productivity assistant. Break down the following task into ordered 20-minute work chunks.

Project: "${project.name}"
Reminder (why this matters): "${project.reminder}"
Task: "${task.name}"

Return ONLY a valid JSON array — no markdown, no explanation, no surrounding text.
Each item must have:
- "order": integer starting at 1
- "title": short action-oriented title (max 8 words)
- "description": 1-2 sentences describing exactly what to do in this 20-minute block

Aim for 2–6 chunks depending on the complexity of the task.`;

        const bedrockResponse = await bedrock.send(
          new ConverseCommand({
            modelId: MODEL_ID,
            messages: [{ role: "user", content: [{ text: prompt }] }],
            inferenceConfig: { maxTokens: 1500 },
          })
        );

        const rawText = bedrockResponse.output.message.content[0].text.trim();

        // Safely extract JSON array even if Claude wraps it in backticks
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Could not parse AI response as JSON array");
        const chunksData = JSON.parse(jsonMatch[0]);

        const chunks = chunksData.map((c) => ({
          chunkId: uuidv4(),
          order: c.order,
          title: c.title,
          description: c.description,
          completed: false,
        }));

        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET chunks = :chunks",
            ExpressionAttributeValues: { ":chunks": chunks },
          })
        );

        return res(200, { ...task, chunks });
      }

      // ── Chunk toggle ────────────────────────────────────────────

      case "PATCH /tasks/{taskId}/chunks/{chunkId}": {
        const taskResult = await dynamo.send(
          new GetCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
          })
        );
        if (!taskResult.Item) return res(404, { error: "Task not found" });
        const task = taskResult.Item;

        const updatedChunks = (task.chunks || []).map((c) =>
          c.chunkId === params.chunkId ? { ...c, ...body } : c
        );

        await dynamo.send(
          new UpdateCommand({
            TableName: TASKS_TABLE,
            Key: { taskId: params.taskId },
            UpdateExpression: "SET chunks = :chunks",
            ExpressionAttributeValues: { ":chunks": updatedChunks },
          })
        );

        return res(200, { ...task, chunks: updatedChunks });
      }

      default:
        return res(404, { error: "Route not found" });
    }
  } catch (err) {
    console.error("Handler error:", err);
    return res(500, { error: err.message || "Internal server error" });
  }
};
