var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
var tableName = 'Tasks';

function buildSpeechletResponseWithCard(title, output, cardOutput, reprompt, shouldEndSession) {
    return {
        outputSpeech:{
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: title,
            content: cardOutput,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: reprompt,
            },       
        },
        shouldEndSession,
    };
}

function buildSpeechletResponse(output, reprompt, shouldEndSession) {
    return {
        outputSpeech:{
            type: 'PlainText',
            text: output,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: reprompt,
            },       
        },
        shouldEndSession,
    };    
}

function buildResponse(attributes, response) {
    return {
      version: '1.0',
      attributes,
      response: response,
    };
}

function deleteTask(intent, session, callback) {
    var taskVal = intent.slots.TaskName.value;
    var attributes = {};
    var output = "The following task has been removed, " + taskVal + ". Is there anything else I can do for you?";
    var shouldEnd = false;
    var user = session.user.userId;
    dynamo.deleteItem({
        TableName: "Tasks",
        Key: {
            UserID : user,
            Task : taskVal
        }
    }, function(err, data) {
        var y = data;
        callback(attributes, buildSpeechletResponse(output, null, shouldEnd));
    });
}

function createTask(intent, session, callback) {
    var taskVal = intent.slots.TaskName.value;
    var attributes = {};
    var output = "The following task has been added, " + taskVal + ". Is there anything else I can do for you?";
    var shouldEnd = false;
    var user = session.user.userId;
    dynamo.putItem({
        TableName: "Tasks",
        Item: {
            UserID : user,
            Task : taskVal
        }
    }, function(err, data) {
        var y = data;
        callback(attributes, buildSpeechletResponse(output, null, shouldEnd));
    });
    
}

function getTasks(intent, session, callback) {
    const attributes = {};
    const cardTitle = "List of Current Tasks";
    var shouldEnd = false;
    var user = session.user.userId;
    var params = {
        TableName : "Tasks",
        KeyConditionExpression: "UserID = :str",
        ProjectionExpression:"UserID, Task",
        ExpressionAttributeValues: {
            ":str":user
        }
    };
    dynamo.query(params, function(err, data){
        var tasks = "";
        data.Items.forEach(function(item){
            if (tasks != "")
                tasks = tasks + ", ";
            tasks = tasks + item.Task;
        });
        const textOutput = "Here are your tasks. " + tasks;
        const speechOutput = "Here are your tasks. " + tasks + ". Is there anything else I can do for you?";
        callback(attributes, buildSpeechletResponseWithCard(cardTitle, speechOutput, textOutput, null, shouldEnd));
   });
}

function getTaskCount(intent, session, callback) {
    const attributes = {};
    var shouldEnd = false;
    var user = session.user.userId;
    var params = {
        TableName : "Tasks",
        KeyConditionExpression: "UserID = :str",
        ExpressionAttributeValues: {
            ":str":user
        }
    };
    dynamo.query(params, function(err, data){
        const speechOutput = "You have " + data.Items.length + " tasks listed. Is there anything else I can do for you?";
        callback(attributes, buildSpeechletResponse(speechOutput, null, shouldEnd));
   });
}

function getHelpMessage(callback) {
    const attributes = {};
    const title = "Task List Help";
    const speechOutput = "Use In Bytes to easily keep track of small to-do items. To create a new item say, Create a new task walk the dog. To delete an item say, Delete task walk the dog. To find out how many items you have, say, How many tasks do i have. To list you items, say, What are my tasks. What would you like to do now?";
    const repromptText = "Sorry I didnt get that, can you repeat the request?";
    const shouldEnd = false;
    callback(attributes, buildSpeechletResponseWithCard(title, speechOutput, speechOutput, repromptText, shouldEnd));
}

function onIntent(intentRequest, session, callback) {
    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    
    if (intentName === "GetList") {
        return getTasks(intent, session, callback);
    } else if (intentName === "GetListCount") {
        return getTaskCount(intent, session, callback);
    } else if (intentName === "CreateTask") {
        return createTask(intent, session, callback);
    } else if (intentName === "DeleteTask") {
        return deleteTask(intent, session, callback);
    } else if (intentName === "AMAZON.HelpIntent") {
        return getHelpMessage(callback);
    } else if (intentName === "AMAZON.CancelIntent") {
        return getEndMessage(callback);
    } else if (intentName === "AMAZON.StopIntent") {
        return getEndMessage(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

function getWelcomeMessage(callback) {
    const attributes = {};
    const speechOutput = "Hi and welcome to In Bytes, your helpful to-do list tool. What can I do for you?";
    const repromptText = "What was that again?";
    const shouldEnd = false;
    callback(attributes, buildSpeechletResponse(speechOutput, repromptText, shouldEnd));
}

function getEndMessage(callback) {
    const attributes = {}; 
    const speechOutput = "Thank you for using In Bytes.";
    const shouldEnd = true;
    callback(attributes, buildSpeechletResponse(speechOutput, null, shouldEnd));
}

function onLaunch(launchRequest, session, callback) {
    getWelcomeMessage(callback);
}
    
function onSessionEnded(request, session, callback) {
    getEndMessage(callback);
}

exports.handler = (event, context, callback) => {
    try
    {
        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};