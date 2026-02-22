#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────
FUNCTION_NAME="chunked-api"
API_NAME="chunked-api"
STAGE="prod"

REGION=$(aws configure get region)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_URI="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FUNCTION_NAME}/invocations"

echo "Region:  ${REGION}"
echo "Account: ${ACCOUNT}"
echo ""

# ── Get existing API ───────────────────────────────────────────────
API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='${API_NAME}'].id | [0]" \
  --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
  echo "ERROR: API '${API_NAME}' not found. Run setup-api-gateway.sh first."
  exit 1
fi
echo "API ID: ${API_ID}"

# ── Get resource IDs ───────────────────────────────────────────────
TASK_ID_RES=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --query "items[?path=='/tasks/{taskId}'].id | [0]" \
  --output text)

CHUNKS_RES=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --query "items[?path=='/tasks/{taskId}/chunks'].id | [0]" \
  --output text)

CHUNK_ID_RES=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --query "items[?path=='/tasks/{taskId}/chunks/{chunkId}'].id | [0]" \
  --output text)

echo "TASK_ID  resource: ${TASK_ID_RES}"
echo "CHUNKS   resource: ${CHUNKS_RES}"
echo "CHUNK_ID resource: ${CHUNK_ID_RES}"
echo ""

# ── Helper ────────────────────────────────────────────────────────
add_method() {
  local res=$1 method=$2
  echo "Adding ${method} to resource ${res}..."
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

# ── Add new methods ────────────────────────────────────────────────
add_method "$TASK_ID_RES"  PATCH
add_method "$CHUNKS_RES"   POST
add_method "$CHUNK_ID_RES" DELETE

# ── Redeploy ──────────────────────────────────────────────────────
echo "Redeploying to stage '${STAGE}'..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  > /dev/null

echo ""
echo "✓ Done! New routes added:"
echo "  PATCH  /tasks/{taskId}"
echo "  POST   /tasks/{taskId}/chunks"
echo "  DELETE /tasks/{taskId}/chunks/{chunkId}"
