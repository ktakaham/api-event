const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  if (!event.requestContext.authorizer) {
    errorResponse(
      "Authorization not configured",
      context.awsRequestId,
      callback
    );
    return;
  }

  const username = event.requestContext.authorizer.claims["cognito:username"];
  const eventBody = JSON.parse(event.body);
  const userData = eventBody.UserData;

  recordUser(username, userData)
    .then(() => {
      callback(null, {
        statusCode: 201,
        body: JSON.stringify({
          EventId: userData.event_id,
          UserID: userData.user_id,
          ChurchName: userData.church_name,
          Rider: username,
        }),
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    })
    .catch((err) => {
      console.error(err);
      errorResponse(err.message, context.awsRequestId, callback);
    });
};

function recordUser(username, userData) {
  const params = {
    RequestItems: {
      event_log: userData.map((userData) => ({
        PutRequest: {
          Item: {
            event_id: userData.event_id,
            user_id: userData.user_id,
            church_name: userData.church_name,
            event_name: userData.event_name,
            event_date: userData.event_date,
            create_date: new Date().toISOString(),
          },
        },
      })),
    },
  };

  return ddb
    .batchWrite(params, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data);
      }
    })
    .promise();
}

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
