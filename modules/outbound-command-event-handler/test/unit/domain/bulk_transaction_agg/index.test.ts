/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 * Modusbox
 - Vijay Kumar Guthi <vijaya.guthi@modusbox.com>
 --------------
 ******/

'use strict'

import { BulkTransactionAgg, IndividualTransferInternalState } from '../../../../src/domain';
import { InMemoryBulkTransactionStateRepo } from '../../../../src/infrastructure';
import { BULK_REQUEST } from '../../data/bulk_transaction_request'
import { DefaultLogger } from '@mojaloop/logging-bc-client-lib';
import { ILogger, LogLevel } from '@mojaloop/logging-bc-public-types-lib';
import { SDKSchemeAdapter, v1_1 as FSPIOP } from '@mojaloop/api-snippets';


const logger: ILogger = new DefaultLogger('SDK-Scheme-Adapter', 'command-event-handler-unit-tests', '0.0.1', LogLevel.INFO);

const bulkTransactionEntityRepo = new InMemoryBulkTransactionStateRepo(logger);

var bulkId: string;

// import { randomUUID } from "crypto";

describe('BulkTransactionAggregate', () => {

    beforeAll(async () => {
        bulkTransactionEntityRepo.init()
    })

    afterAll(async () => {
        bulkTransactionEntityRepo.destroy()
    })

    test('BulkTransactionAggregate should be created from request', async () => {
        // Create aggregate
        const bulkTransactionAgg = await BulkTransactionAgg.CreateFromRequest(
            BULK_REQUEST,
            bulkTransactionEntityRepo,
            logger,
        );
        expect(bulkTransactionAgg.bulkId).not.toBeNull()
        bulkId = bulkTransactionAgg.bulkId;
        const bulkTransactionEntity = bulkTransactionAgg.getBulkTransaction()
        const bulkTransactionEntityState = bulkTransactionEntity.exportState()
        expect(bulkTransactionEntityState.bulkHomeTransactionID).not.toBeNull()
        expect(bulkTransactionEntityState.bulkTransactionId).not.toBeNull()
        const allIndividualTransferIds = await bulkTransactionAgg.getAllIndividualTransferIds()
        expect(Array.isArray(allIndividualTransferIds)).toBe(true)
        expect(allIndividualTransferIds.length).toEqual(2)
    })
    xtest('BulkTransactionAggregate should be created from repository', async () => {
        // Create aggregate
        const bulkTransactionAgg = await BulkTransactionAgg.CreateFromRepo(
            bulkId,
            bulkTransactionEntityRepo,
            logger,
        );
        const bulkTransactionEntity = bulkTransactionAgg.getBulkTransaction()
        const bulkTransactionEntityState = bulkTransactionEntity.exportState()
        expect(bulkTransactionEntityState.bulkHomeTransactionID).not.toBeNull()
        expect(bulkTransactionEntityState.bulkTransactionId).not.toBeNull()
        const allIndividualTransferIds = await bulkTransactionAgg.getAllIndividualTransferIds()
        expect(Array.isArray(allIndividualTransferIds)).toBe(true)
        expect(allIndividualTransferIds.length).toEqual(2)
    })
    test('BulkTransactionAggregate should create batches for bulkQuotes and bulkTransfers', async () => {
        // Create aggregate
        const bulkTransactionAgg = await BulkTransactionAgg.CreateFromRepo(
            bulkId,
            bulkTransactionEntityRepo,
            logger,
        );
        // Simulate party resposnes
        const partyResponse1: FSPIOP.Schemas.PartyResult = {
            partyId: {
                partyIdType: 'MSISDN',
                partyIdentifier: '123',
                fspId: 'dfsp1'
            }
        }
        const partyResponse2: FSPIOP.Schemas.PartyResult = {
            partyId: {
                partyIdType: 'MSISDN',
                partyIdentifier: '321',
                fspId: 'dfsp2'
            }
        }
        const allIndividualTransferIds = await bulkTransactionAgg.getAllIndividualTransferIds();
        const individualTransfer1 = await bulkTransactionAgg.getIndividualTransferById(allIndividualTransferIds[0]);
        individualTransfer1.setPartyResponse(partyResponse1);
        individualTransfer1.setTransferState(IndividualTransferInternalState.DISCOVERY_SUCCESS);
        await bulkTransactionAgg.setIndividualTransferById(individualTransfer1.id, individualTransfer1);
        const individualTransfer2 = await bulkTransactionAgg.getIndividualTransferById(allIndividualTransferIds[1]);
        individualTransfer2.setPartyResponse(partyResponse1);
        individualTransfer2.setTransferState(IndividualTransferInternalState.DISCOVERY_SUCCESS);
        await bulkTransactionAgg.setIndividualTransferById(individualTransfer2.id, individualTransfer2);
        // console.log(individualTransfer.exportState())

        // logger.info(`Created BulkTransactionAggregate ${bulkTransactionAgg}`);
        await bulkTransactionAgg.createBatches();
    })
})


'use strict';

// import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
// import { CommandEventMessage, ProcessSDKOutboundBulkRequestMessage, SDKOutboundBulkPartyInfoRequestedMessage } from '@mojaloop/sdk-scheme-adapter-private-shared-lib';
// import { ICommandEventHandlerOptions } from '@module-types';

// export async function handleProcessSDKOutboundBulkRequestMessage(
//     message: CommandEventMessage,
//     options: ICommandEventHandlerOptions,
//     logger: ILogger,
// ): Promise<void> {
//     const processSDKOutboundBulkRequestMessage = message as ProcessSDKOutboundBulkRequestMessage;
//     try {
//         logger.info(`Got Bulk Request ${processSDKOutboundBulkRequestMessage.getBulkRequest()}`);

//         // Create aggregate
//         const bulkTransactionAgg = await BulkTransactionAgg.CreateFromRequest(
//             processSDKOutboundBulkRequestMessage.getBulkRequest(),
//             options.bulkTransactionEntityRepo,
//             logger,
//         );
//         logger.info(`Created BulkTransactionAggregate ${bulkTransactionAgg}`);

//         const msg = new SDKOutboundBulkPartyInfoRequestedMessage({
//             bulkId: bulkTransactionAgg.bulkId,
//             timestamp: Date.now(),
//             headers: [],
//         });
//         await options.domainProducer.sendDomainMessage(msg);

//     /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
//     } catch (err: any) {
//         logger.info(`Failed to create BulkTransactionAggregate. ${err.message}`);
//     }
// }