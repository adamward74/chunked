# Chunked — AWS Setup Guide

Follow these steps once in the AWS Console to get everything running.
All services used are in the AWS free tier for personal use.

---

## Prerequisites

- AWS account with admin access
- Node.js installed locally (for building the frontend)
- A GitHub account (for Amplify deployment)

---

## Step 1 — Enable Claude on AWS Bedrock

1. Open the [AWS Console](https://console.aws.amazon.com) and go to **Amazon Bedrock**
2. In the left sidebar click **Model access**
3. Click **Modify model access**
4. Find **Amazon → Nova Lite** and tick the checkbox
5. Click **Next → Submit**

> Amazon Nova models are typically approved instantly with no review process. No region restrictions — works in all Bedrock regions.

---

## Step 2 — Create DynamoDB Tables

Go to **DynamoDB** in the AWS Console.

### Table 1: Projects

1. Click **Create table**
2. Table name: `chunked-projects`
3. Partition key: `projectId` (String)
4. Leave everything else as default (On-demand capacity is fine)
5. Click **Create table**

### Table 2: Tasks

1. Click **Create table**
2. Table name: `chunked-tasks`
3. Partition key: `taskId` (String)
4. Click **Create table** — then open the table once created
5. Go to the **Indexes** tab → click **Create index**
   - Partition key: `projectId` (String)
   - Index name: `projectId-index`
   - Leave sort key empty
   - Click **Create index** and wait for it to become Active

---

## Step 3 — Create the Lambda Function

Go to **Lambda** in the AWS Console.

1. Click **Create function**
2. Choose **Author from scratch**
   - Function name: `chunked-api`
   - Runtime: **Node.js 20.x**
   - Architecture: x86_64
3. Click **Create function**

### Upload the code

1. On your local machine, open a terminal in the `backend/` folder
2. Run:
   ```bash
   npm install
   zip -r ../chunked-api.zip .
   ```
3. Back in the Lambda console, click **Upload from → .zip file**
4. Upload `chunked-api.zip`
5. Click **Save**

### Set environment variables

In the Lambda console, go to **Configuration → Environment variables → Edit**, and add:

| Key | Value |
|-----|-------|
| `PROJECTS_TABLE` | `chunked-projects` |
| `TASKS_TABLE` | `chunked-tasks` |
| `BEDROCK_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `amazon.nova-lite-v1:0` |

Click **Save**.

### Increase the timeout

Go to **Configuration → General configuration → Edit**:
- Timeout: `30 seconds` (AI calls can take a moment)
- Click **Save**

---

## Step 4 — Give Lambda Permission to Use DynamoDB and Bedrock

1. In the Lambda console, go to **Configuration → Permissions**
2. Click the **role name** link (opens IAM)
3. Click **Add permissions → Attach policies**
4. Search for and attach each of these:
   - `AmazonDynamoDBFullAccess`
   - `AmazonBedrockFullAccess`
5. Click **Add permissions**

---

## Step 5 — Create the API Gateway

Go to **API Gateway** in the AWS Console.

1. Click **Create API**
2. Choose **REST API** (not HTTP API, not private) → click **Build**
3. Choose **New API**
   - API name: `chunked-api`
4. Click **Create API**

### Create resources and methods

You need to create these routes. For each one, the method will be integrated with your Lambda.

```
/projects                     GET, POST
/projects/{projectId}         DELETE
/projects/{projectId}/tasks   GET, POST
/tasks/{taskId}               DELETE
/tasks/{taskId}/breakdown     POST
/tasks/{taskId}/chunks/{chunkId}  PATCH
```

#### How to create a resource:

1. Select the parent resource in the left tree (start at `/`)
2. Click **Create resource**
3. Enter the resource name/path (e.g., `projects` or `{projectId}`)
4. Tick **CORS** checkbox on each resource
5. Click **Create resource**

Repeat to build the full tree:
```
/
└── projects
    └── {projectId}
        └── tasks
└── tasks
    └── {taskId}
        ├── breakdown
        └── chunks
            └── {chunkId}
```

#### How to add a method:

1. Select a resource
2. Click **Create method**
3. Method type: e.g., `GET`
4. Integration type: **Lambda function**
5. Enable **Lambda proxy integration**
6. Lambda function: `chunked-api`
7. Click **Save**

Repeat for each method listed above.

#### Enable CORS on all resources:

For each resource in the tree:
1. Select the resource
2. Click **Enable CORS**
3. Keep defaults and click **Save**

### Deploy the API

1. Click **Deploy API**
2. Stage: **New stage**
3. Stage name: `prod`
4. Click **Deploy**
5. Copy the **Invoke URL** — it looks like:
   ```
   https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
   ```

---

## Step 6 — Configure the Frontend

1. In the `frontend/` folder, create a file called `.env.local`:
   ```
   VITE_API_URL=https://YOUR_INVOKE_URL/prod
   ```
   Replace `YOUR_INVOKE_URL` with the URL from Step 5.

2. Build the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   This creates a `dist/` folder.

---

## Step 7 — Deploy Frontend with AWS Amplify

1. Push your project to a **GitHub repository**
2. Go to **AWS Amplify** in the console
3. Click **Create new app**
4. Choose **Host web app** → **GitHub** → connect your account
5. Select your repository and branch (e.g., `main`)
6. App settings:
   - App name: `chunked`
   - Build settings — click **Edit** and use:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd frontend && npm install
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: frontend/dist
         files:
           - '**/*'
       cache:
         paths:
           - frontend/node_modules/**/*
     ```
7. **Add environment variable** before saving:
   - Key: `VITE_API_URL`
   - Value: `https://YOUR_INVOKE_URL/prod`
8. Click **Save and deploy**

Amplify will give you a URL like `https://main.d1abc.amplifyapp.com` — that's your app!

---

## Updating the Lambda code

When you make changes to `backend/index.js`:

```bash
cd backend
npm install
zip -r ../chunked-api.zip .
```

Then upload the new zip in the Lambda console (**Upload from → .zip file**).

## Updating the frontend

Just push to GitHub — Amplify auto-deploys on every commit.

---

## Cost estimate

For personal use (a few requests per day):
- **Lambda**: effectively free (1M free requests/month)
- **DynamoDB**: effectively free (25GB free storage, 25 WCU/RCU)
- **API Gateway**: effectively free (~$0.001 per 1000 requests)
- **Bedrock (Claude 3 Haiku)**: ~$0.001–$0.005 per breakdown request
- **Amplify Hosting**: free tier covers personal projects

**Total: ~$0–$1/month**
