'use strict';

const request = require('request');

/**
 * Use this command to launch the handler from console:
 *
 * node_modules/.bin/serverless invoke local -f lambda -d '{"httpMethod":"GET","queryStringParameters":{"url":"http://github.com"}}'
 *
 *  or from browser
 *
 * http://localhost:3000/?url=https://github.com
 */
module.exports.corsProxy = (event, context, callback) => {
    let params = event.queryStringParameters;
    let { Host, host, Origin, origin, ...headers } = event.headers;

    console.log(event);
    console.log(`Got request with params:`, params);

    if (!params || !params.url) {
        const errorResponse = {
            statusCode: 400,
            body: 'Unable get url from \'url\' query parameter'
        };
        callback(null, errorResponse);
        return;
    }

    // only proxy .hex file requests
    if (!params.url.endsWith(".hex") &&
        !params.url.endsWith(".arduboy") &&
        !params.url.endsWith(".bin") &&
        !params.url.endsWith(".json")) {
        const errorResponse = {
            statusCode: 400,
            body: 'Unable get fetch non-Arduboy file'
        };
        callback(null, errorResponse);
        return;
    }

    // remote accept-encoding from headers
    delete headers['accept-encoding'];
    delete headers['Accept-Encoding'];
    delete headers['Accept-encoding'];

    return new Promise((resolve, reject) => {
        let originalRequestBody = event.body;
        request({
            url: params.url,
            method: event.httpMethod,
	    encoding: null, // needed to prevent binary data from being UTF-8 encoded
	    gzip: true, // allow compressed data to be returned from server
            timeout: 20000,
            json: null,
            headers,
        }, (err, originalResponse, body) => {
            if (err) {
                console.log(`Got error`, err);
                callback(err);
                reject(err);
                return;
            }

            console.log(`Got response from ${params.url} ---> {statusCode: ${originalResponse.statusCode}}`);
            const proxyBody = originalRequestBody ? JSON.stringify(body) : originalResponse.body;

            const proxyResponse = {
                statusCode: originalResponse.statusCode,
                headers: {
                    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                    "Access-Control-Allow-Credentials" : true, // Required for cookies, authorization headers with HTTPS
                    "content-type": originalResponse.headers['content-type'],
		    "x-content-type-options": "nosniff"
                },
                body: proxyBody.toString('base64'),
		isBase64Encoded: true
            };

            callback(null, proxyResponse);

            resolve(proxyResponse);
        });
    });
};
