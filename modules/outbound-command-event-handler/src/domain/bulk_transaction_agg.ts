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

'use strict';

import {ILogger} from '@mojaloop/logging-bc-public-types-lib';
import {BaseAggregate, IEntityStateRepository} from '@mojaloop/sdk-scheme-adapter-public-shared-lib';
import {BulkTransactionEntity, BulkTransactionInternalState, BulkTransactionState} from './bulk_transaction_entity';
import {
    IndividualTransferEntity,
    IndividualTransferInternalState,
    IndividualTransferState,
    IPartyRequest
} from './individual_transfer_entity';
import {IBulkTransactionEntityRepo} from '../types';
import {
    PartyInfoRequestedMessage,
} from '@mojaloop/sdk-scheme-adapter-private-shared-lib/dist/events/outbound_command_event_message/party_info_requested';

export class BulkTransactionAgg extends BaseAggregate<BulkTransactionEntity, BulkTransactionState> {
    // TODO: These counts can be part of bulk transaction entity?
    // private _partyLookupTotalCount?: number;
    // private _partyLookupSuccessCount?: number;
    // private _partyLookupFailedCount?: number;
    // // NEXT_STORY
    // private _bulkBatches: Array<BulkBatchState>; // Create bulk batch entity
    // private _bulkQuotesTotalCount: number;
    // private _bulkQuotesSuccessCount: number;
    // private _bulkQuotesFailedCount: number;
    // private _bulkTransfersTotalCount: number;
    // private _bulkTransfersSuccessCount: number;
    // private _bulkTransfersFailedCount: number;

    // constructor(
    //   bulkTransactionEntity: BulkTransactionEntity,
    //   entityStateRepo: IEntityStateRepository<BulkTransactionState>,
    //   logger: ILogger
    // ) {
    //     super(bulkTransactionEntity, entityStateRepo, logger);
    // }

    static async CreateFromRequest(
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        request: any,
        entityStateRepo: IEntityStateRepository<BulkTransactionState>,
        logger: ILogger,
    ): Promise<BulkTransactionAgg> {
    // Create root entity
        const bulkTransactionEntity = BulkTransactionEntity.CreateFromRequest(request);
        // Create the aggregate
        const agg = new BulkTransactionAgg(bulkTransactionEntity, entityStateRepo, logger);
        // Persist in the rep
        await agg.store();
        // Create individualTransfer entities
        if(Array.isArray(request?.individualTransfers)) {
            // TODO: limit the number of concurrently created promises to avoid nodejs high memory consumption
            await Promise.all(request.individualTransfers.map((individualTransfer: any) =>
                agg.addIndividualTransferEntity(IndividualTransferEntity.CreateFromRequest(individualTransfer))));
        }
        // Return the aggregate
        return agg;
    }

    static async CreateFromRepo(
        id: string,
        entityStateRepo: IEntityStateRepository<BulkTransactionState>,
        logger: ILogger,
    ): Promise<BulkTransactionAgg> {
    // Get the root entity state from repo
        let state: BulkTransactionState | null;
        try {
            state = await entityStateRepo.load(id);
        } catch (err) {
            throw new Error('Aggregate data is not found in repo');
        }
        if(state) {
            // Create root entity
            const bulkTransactionEntity = new BulkTransactionEntity(state);
            // Create the aggregate
            const agg = new BulkTransactionAgg(bulkTransactionEntity, entityStateRepo, logger);
            // Return the aggregate
            return agg;
        } else {
            throw new Error('Aggregate data is not found in repo');
        }
    }

    setTxState(state: BulkTransactionInternalState) {
        this._rootEntity.setTxState(state);
    }

    async resolveParties() {
        const repo = this._entity_state_repo as IBulkTransactionEntityRepo;
        const allAttributes = await repo.getAllAttributes(this._rootEntity.id);
        const allIndividualTransferIds = allAttributes.filter(attr => attr.startsWith('individualItem_')).map(attr => attr.replace('individualItem_', ''))
        for await (const individualTransferId of allIndividualTransferIds) {
            const individualTransferState: IndividualTransferState = await repo.getAttribute(this._rootEntity.id, 'individualItem_' + individualTransferId);
            const individualTransfer = new IndividualTransferEntity(individualTransferState);
            if(individualTransfer.payeeResolved) {
                continue;
                // if(individualTransfer.transferState() !== IndividualTransferInternalState.DISCOVERY_SUCCESS) {
                //     individualTransferState.state = IndividualTransferInternalState.DISCOVERY_SUCCESS;
                //     await (<IBulkTransactionEntityRepo> this._entity_state_repo)
                //         .setAttribute(this._rootEntity.id, 'individualItem_' + individualTransferId, individualTransferState);
                // }
            }
            // if(!individualTransfer.partyRequest) {
            const msg = new PartyInfoRequestedMessage({
                timestamp: Date.now(),
                headers: [],
                request: {
                    id: individualTransfer.id,
                    request: individualTransfer.payee,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                    version: 1,
                },
                transferId: individualTransferId,
            });
            // individualTransferState.partyRequest = msg.getContent();
            // }
            // TODO: send Message
            individualTransferState.state = IndividualTransferInternalState.DISCOVERY_PROCESSING;
            await (<IBulkTransactionEntityRepo> this._entity_state_repo)
                .setAttribute(this._rootEntity.id, 'individualItem_' + individualTransferId, individualTransferState);
            // const transferEntity = new IndividualTransferEntity(individualTransferState);
        }
    }

    async addIndividualTransferEntity(entity: IndividualTransferEntity) : Promise<void> {
        await (<IBulkTransactionEntityRepo> this._entity_state_repo)
            .setAttribute(this._rootEntity.id, 'individualItem_' + entity.id, entity.exportState());
    }

    async destroy() : Promise<void> {
        if(this._rootEntity) {
            // Cleanup repo
            await this._entity_state_repo.remove(this._rootEntity.id);
            // Cleanup properties
            // this._rootEntity = null
            // this._partyLookupTotalCount = undefined;
            // this._partyLookupSuccessCount = undefined;
            // this._partyLookupFailedCount = undefined;
        }
    }
}
