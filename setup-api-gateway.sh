#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────
FUNCTION_NAME="chunked-api"
API_NAME="chunked-api"
STAGE="prod"

REGION=$(aws configure get region)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}"
LAMBDA_URI="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

echo "Region:  ${REGION}"
echo "Account: ${ACCOUNT}"
echo ""

# ── Create API ────────────────────────────────────────────────────
echo "Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
  --name "$API_NAME" \
  --query 'id' --output text)
echo "API ID: ${API_ID}"

# Get root resource ID
ROOT=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --query 'items[0].id' --output text)

# ── Helpers ───────────────────────────────────────────────────────
create_resource() {
  aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$1" \
    --path-part "$2" \
    --query 'id' --output text
}

add_method() {
  local res=$1 method=$2
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$res" \
    --http-method "$method" \
    --authorization-type NONE \
    > /dev/null
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$res" \
    --http-method "$method" \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "$LAMBDA_URI" \
    > /dev/null
}

# ── Build resource tree ───────────────────────────────────────────
echo "Creating resources..."

# /projects
PROJECTS=$(create_resource "$ROOT" "projects")

# /projects/{projectId}
PROJECT_ID=$(create_resource "$PROJECTS" "{projectId}")

# /projects/{projectId}/tasks
PROJECT_TASKS=$(create_resource "$PROJECT_ID" "tasks")

# /tasks
TASKS=$(create_resource "$ROOT" "tasks")

# /tasks/{taskId}
TASK_ID=$(create_resource "$TASKS" "{taskId}")

# /tasks/{taskId}/breakdown
BREAKDOWN=$(create_resource "$TASK_ID" "breakdown")

# /tasks/{taskId}/chunks
CHUNKS=$(create_resource "$TASK_ID" "chunks")

# /tasks/{taskId}/chunks/{chunkId}
CHUNK_ID=$(create_resource "$CHUNKS" "{chunkId}")

# ── Add methods ───────────────────────────────────────────────────
echo "Adding methods..."

add_method "$PROJECTS"     GET
add_method "$PROJECTS"     POST
add_method "$PROJECTS"     OPTIONS

add_method "$PROJECT_ID"   DELETE
add_method "$PROJECT_ID"   OPTIONS

add_method "$PROJECT_TASKS" GET
add_method "$PROJECT_TASKS" POST
add_method "$PROJECT_TASKS" OPTIONS

add_method "$TASK_ID"      DELETE
add_method "$TASK_ID"      OPTIONS

add_method "$BREAKDOWN"    POST
add_method "$BREAKDOWN"    OPTIONS

add_method "$CHUNK_ID"     PATCH
add_method "$CHUNK_ID"     OPTIONS

# ── Lambda permission ─────────────────────────────────────────────
echo "Granting API Gateway permission to invoke Lambda..."
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id apigateway-invoke-chunked \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API_ID}/*/*" \
  > /dev/null

# ── Deploy ────────────────────────────────────────────────────────
echo "Deploying to stage '${STAGE}'..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  > /dev/null

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo "✓ Done!"
echo ""
echo "Your API URL:"
echo "  https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"
echo ""
echo "Add this to frontend/.env.local:"
echo "  VITE_API_URL=https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"
