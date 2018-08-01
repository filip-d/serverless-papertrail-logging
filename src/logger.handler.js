'use strict';

const papertrail = require('winston-papertrail').Papertrail;
const winston = require('winston');
const zlib = require('zlib');
/*
const formatLog = (level, message) => {
  const consoleLog = message.split('\t');
  if (consoleLog.length === 3) {
    try {
      const logData = JSON.parse(consoleLog[2]);
      if (_.has(logData.event, 'body') && _.isString(logData.event.body)) {
        logData.event.body = JSON.parse(logData.event.body);
      }
      if (!_.has(logData, 'event.requestId')) {
        logData.event.requestId = consoleLog[1];
      }
      return JSON.stringify(logData);
    } catch (e) {
      return JSON.stringify({ requestId: consoleLog[1], log: consoleLog[2] });
    }
  }

  try {
    const logData = JSON.parse(message);
    if (!_.has(logData, 'statusCode')) {
      logData.statusCode = 500;
    }
    return JSON.stringify(logData);
  } catch (e) {
    return message;
  }
};
*/
exports.handler = (event, context, callback) => {
  const logger = new (winston.Logger)({
    transports: [],
  });
  logger.add(papertrail, {
    host: '%papertrailHost%',
    port: '%papertrailPort%',
    hostname: '%papertrailHostname%',
    program: '%papertrailProgram%',
    flushOnClose: true,
    includeMetaInMessage: false,
    handleExceptions: true,
    humanReadableUnhandledException: false,
  //  logFormat: formatLog,
  });
  logger.setLevels(winston.config.syslog.levels);
    const payload = new Buffer(event.awslogs.data, 'base64');
    zlib.gunzip(payload, (err, result) => {
        if (err) {
            return callback(err);
        }

        const logData = JSON.parse(result.toString('utf8'));
        if (logData.messageType === 'CONTROL_MESSAGE') {
            return callback();
        }

        logData.logEvents.forEach((line) => {
            if (line.message && !line.message.startsWith('START RequestId') && !line.message.startsWith('END RequestId')
                && !line.message.startsWith('REPORT RequestId')) {
                const logEntries = line.message.split('\t')
                if (logEntries.length >= 4) {
                    papertrail.program = logEntries[4];
                    const message = logEntries.slice(4).join('\t');
                    switch (logEntries[2].toLowerCase()) {
                        case "error":
                            logger.error(message);
                            break;
                        case "warning":
                            logger.warning(message);
                            break;
                        case "info":
                            logger.warning(message);
                            break;
                        default:
                            logger.debug(message);
                     }
               } else {
                    logger.debug(line.message)
                }
            }
        });

        logger.close();
        return callback();
    });
};
