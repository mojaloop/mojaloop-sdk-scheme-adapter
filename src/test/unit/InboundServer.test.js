/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

'use strict';

const supertest = require('supertest');

const defaultConfig = require('./data/defaultConfig');
const putPartiesBody = require('./data/putPartiesBody');
const postQuotesBody = require('./data/postQuotesBody');
const putParticipantsBody = require('./data/putParticipantsBody');
const commonHttpHeaders = require('./data/commonHttpHeaders');

jest.mock('@internal/cache');
jest.mock('@mojaloop/sdk-standard-components');
jest.mock('@internal/requests');

const { Jws } = require('@mojaloop/sdk-standard-components');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const InboundServer = require('../../InboundServer');

describe('Inbound Server', () => {
    describe('PUT /parties', () => {
        let serverConfig;

        beforeEach(() => {
            Jws.validator.__validate.mockClear();
            serverConfig = JSON.parse(JSON.stringify(defaultConfig));
        });

        async function testPartiesJwsValidation(validateInboundJws, validateInboundPutPartiesJws, expectedValidationCalls) {
            serverConfig.validateInboundJws = validateInboundJws;
            serverConfig.validateInboundPutPartiesJws = validateInboundPutPartiesJws;
            const svr = new InboundServer(serverConfig);
            const req = supertest(await svr.setupApi());
            await svr.start();
            await req
                .put('/parties/MSISDN/123456789')
                .send(putPartiesBody)
                .set(commonHttpHeaders)
                .set('fspiop-http-method', 'PUT')
                .set('fspiop-uri', '/parties/MSISDN/123456789')
                .set('date', new Date().toISOString());
            await svr.stop();
            expect(Jws.validator.__validate).toHaveBeenCalledTimes(expectedValidationCalls);
        }

        test('validates incoming JWS when VALIDATE_INBOUND_JWS and VALIDATE_INBOUND_PUT_PARTIES_JWS is true', () =>
            testPartiesJwsValidation(true, true, 1));

        test('does not validate incoming JWS when VALIDATE_INBOUND_JWS is true and VALIDATE_INBOUND_PUT_PARTIES_JWS is false', () =>
            testPartiesJwsValidation(true, false, 0));

        test('does not validate incoming JWS when VALIDATE_INBOUND_JWS is false and VALIDATE_INBOUND_PUT_PARTIES_JWS is false', () =>
            testPartiesJwsValidation(false, false, 0));

        test('does not validate incoming JWS when VALIDATE_INBOUND_JWS is false and VALIDATE_INBOUND_PUT_PARTIES_JWS is true', () =>
            testPartiesJwsValidation(false, true, 0));
    });

    describe('PUT /quotes', () => {
        let serverConfig;
        beforeEach(() => {
            Jws.validator.__validate.mockClear();
            serverConfig = JSON.parse(JSON.stringify(defaultConfig));
        });
        async function testQuotesJwsValidation(validateInboundJws, validateInboundPutPartiesJws, expectedValidationCalls) {
            serverConfig.validateInboundJws = validateInboundJws;
            serverConfig.validateInboundPutPartiesJws = validateInboundPutPartiesJws;
            const svr = new InboundServer(serverConfig);
            const req = supertest(await svr.setupApi());
            await svr.start();
            await req
                .post('/quotes')
                .send(postQuotesBody)
                .set(commonHttpHeaders)
                .set('fspiop-http-method', 'POST')
                .set('fspiop-uri', '/quotes')
                .set('date', new Date().toISOString());
            await svr.stop();
            expect(Jws.validator.__validate).toHaveBeenCalledTimes(expectedValidationCalls);
        }

        test('validates incoming JWS on other routes when VALIDATE_INBOUND_JWS is true and VALIDATE_INBOUND_PUT_PARTIES_JWS is false', () =>
            testQuotesJwsValidation(true, false, 1));

        test('validates incoming JWS on other routes when VALIDATE_INBOUND_JWS is true and VALIDATE_INBOUND_PUT_PARTIES_JWS is true', () =>
            testQuotesJwsValidation(true, true, 1));
    });

    describe('PUT /participants', () => {
        let serverConfig;
        beforeEach(() => {
            Jws.validator.__validate.mockClear();
            serverConfig = JSON.parse(JSON.stringify(defaultConfig));
        });

        async function testParticipantsJwsValidation(validateInboundJws, validateInboundPutPartiesJws, expectedValidationCalls) {
            serverConfig.validateInboundJws = validateInboundJws;
            serverConfig.validateInboundPutPartiesJws = validateInboundPutPartiesJws;
            const svr = new InboundServer(serverConfig);
            const req = supertest(await svr.setupApi());
            await svr.start();
            await req
                .put('/participants/00000000-0000-1000-a000-000000000002')
                .send(putParticipantsBody)
                .set(commonHttpHeaders)
                .set('fspiop-http-method', 'PUT')
                .set('fspiop-uri', '/participants/00000000-0000-1000-a000-000000000002')
                .set('date', new Date().toISOString());
            await svr.stop();
            expect(Jws.validator.__validate).toHaveBeenCalledTimes(expectedValidationCalls);
        }

        test('validates incoming JWS when VALIDATE_INBOUND_JWS is true', () =>
            testParticipantsJwsValidation(true, true, 1));

        test('does not validate incoming JWS when VALIDATE_INBOUND_JWS is false ', () =>
            testParticipantsJwsValidation(false, false, 0));
    });

    describe('mTLS test', () => {
        let defConfig;
        let httpServerSpy;
        let httpsServerSpy;

        beforeAll(() => {
            httpServerSpy = jest.spyOn(http, 'createServer');
            httpsServerSpy = jest.spyOn(https, 'createServer');
        });

        beforeEach(() => {
            defConfig = JSON.parse(JSON.stringify(defaultConfig));
            httpServerSpy.mockClear();
            httpsServerSpy.mockClear();
        });

        afterAll(() => {
            httpServerSpy.mockRestore();
            httpsServerSpy.mockRestore();
        });

        async function testTlsServer(enableTls) {
            defConfig.tls.inbound.mutualTLS.enabled = enableTls;
            const server = new InboundServer(defConfig);
            await server.setupApi();
            if (enableTls) {
                expect(httpsServerSpy).toHaveBeenCalled();
                expect(httpServerSpy).not.toHaveBeenCalled();
            } else {
                expect(httpsServerSpy).not.toHaveBeenCalled();
                expect(httpServerSpy).toHaveBeenCalled();
            }
        }

        test('Inbound server should use HTTPS if inbound mTLS enabled', () =>
            testTlsServer(true));

        test('Inbound server should use HTTP if inbound mTLS disabled', () =>
            testTlsServer(false));
    });


    describe('JWS verification keys', () => {
        let svr;
        let keysDir;

        beforeEach(async () => {
            const serverConfig = JSON.parse(JSON.stringify(defaultConfig));
            serverConfig.validateInboundJws = true;
            keysDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-'));
            const mockFilePath = path.join(keysDir, 'mojaloop-sdk.pem');
            fs.writeFileSync(mockFilePath, 'foo-key');
            serverConfig.jwsVerificationKeysDirectory = keysDir;
            svr = new InboundServer(serverConfig);
            await svr.setupApi();
            await svr.start();
        });

        afterEach(async () => {
            await svr.stop();
            fs.rmdirSync(keysDir, { recursive: true });
        });

        it('updates server configuration when a new JWS verification key '
            + 'is added to the target monitored folder.', async () => {
            let keys;

            keys = Object.keys(Jws.validator.__validationKeys);
            expect(keys).toEqual(['mojaloop-sdk']);

            const mockFilePath = path.join(keysDir, 'mock-jws.pem');
            fs.writeFileSync(mockFilePath, 'foo-key');

            await new Promise(resolve => setTimeout(() => resolve(), 1000));

            keys = Object.keys(Jws.validator.__validationKeys);
            expect(keys).toEqual(['mojaloop-sdk', 'mock-jws']);
        });

        it('updates server configuration when a new JWS verification key '
            + 'is removed to the target monitored folder.', async () => {
            let keys;

            keys = Object.keys(Jws.validator.__validationKeys);
            expect(keys).toEqual(['mojaloop-sdk']);

            const mockFilePath = path.join(keysDir, 'mock-jws.pem');
            fs.writeFileSync(mockFilePath, 'foo-key');

            await new Promise(resolve => setTimeout(() => resolve(), 1000));

            keys = Object.keys(Jws.validator.__validationKeys);
            expect(keys).toEqual(['mojaloop-sdk', 'mock-jws']);

            fs.unlinkSync(mockFilePath);

            await new Promise(resolve => setTimeout(() => resolve(), 1000));

            keys = Object.keys(Jws.validator.__validationKeys);
            expect(keys).toEqual(['mojaloop-sdk']);
        });
    });
});
