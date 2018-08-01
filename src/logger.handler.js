'use strict';

const papertrail = require('winston-papertrail').Papertrail;
const winston = require('winston');
const zlib = require('zlib');

module.exports.handler = (event, context, callback) => {
    const logger = new (winston.Logger)({
        transports: [],
        levels: winston.config.syslog
    });
    logger.add(papertrail, {
        host: "%papertrailHost%",
        port: %papertrailPort%,
        level: '%papertrailLevel%',
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
                const level = logEntries[2].toLowerCase();
                if (logEntries.length >= 4 && winston.config.syslog.levels.hasOwnProperty(level)) {
                    logger.transports.Papertrail.program = logEntries[3];
                   const message = logEntries.slice(4).join('\t');
                    logger.log(level, message);
               } else {
                    logger.log("debug", level + ":" + line.message)
                }
            }
        });

        logger.close();
        return callback();
    });
};
