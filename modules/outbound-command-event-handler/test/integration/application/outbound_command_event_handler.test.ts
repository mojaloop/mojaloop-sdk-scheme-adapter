

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
 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 - Vijay Kumar Guthi <vijaya.guthi@modusbox.com>
 --------------
 ******/

'use strict'

import { DefaultLogger } from "@mojaloop/logging-bc-client-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

import { DomainEventMessage, EventMessageType, OutboundDomainEventMessageName, IDomainEventMessageData } from '@mojaloop/sdk-scheme-adapter-private-shared-lib'
import { KafkaDomainEventProducer } from '@mojaloop/sdk-scheme-adapter-private-shared-lib'

const logger: ILogger = new DefaultLogger('bc', 'appName', 'appVersion'); //TODO: parameterize the names here
const producer = new KafkaDomainEventProducer(logger)

const sampleDomainEventMessageData: IDomainEventMessageData = {
  key: 'sample-key1',
  name: OutboundDomainEventMessageName.SDKOutboundBulkRequestReceived,
  content: {
    id: '123784627836457823',
    options: {},
    individualTransfers: []
  },
  timestamp: Date.now(),
  headers: []
}

describe('First domain event', () => {
  beforeEach(async () => {
    await producer.init();
  });

  afterEach(async () => {
    await producer.destroy();
  });

  test('Inbound event ProcessSDKOutboundBulkRequest should publish outbound SDKOutboundBulkPartyInfoRequested event. Global state should be RECEIVED.', async () => {
    //TODO add asserts

    //TODO question: In sequence diagram it says, break json into smaller parts. What does it mean by smaller parts
  })

  test('Inbound event ProcessSDKOutboundBulkPartyInfoRequest should update global state to DISCOVERY_PROCESSING. Party info does not already exist for none of the individual transfers. So PartyInfoRequested event should be published for each individual transfer.', async () => {
    //TODO add asserts

    
  })
})
