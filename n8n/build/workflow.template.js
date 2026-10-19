import { workflow, node, trigger, ifElse, embeddings, documentLoader, textSplitter, expr, newCredential } from '@n8n/workflow-sdk';

const SB = 'https://cehtnihgfnfpvrqnsgjb.supabase.co/rest/v1/rpc/';
const ORIGINS = 'https://lesson7-alon-landing.vercel.app';
const supabaseCred = { supabaseApi: { id: 'cUIBZbb1y2Ng0Lev', name: 'AI-Dev-Academy' } };
const openAiCred = { openAiApi: { id: 'VJumZavN9QTNzhnJ', name: 'n8n Open API Key FocusAI' } };

const uploadWebhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: {
    name: 'Upload Webhook',
    parameters: { httpMethod: 'POST', path: 'alon-kb/upload', authentication: 'headerAuth', responseMode: 'responseNode', options: { allowedOrigins: ORIGINS, binaryPropertyName: 'file' } },
    credentials: { httpHeaderAuth: newCredential('alon-kb-admin') }
  },
  output: [{ body: { doc_key: 'pricelist', simulate_fail: '' } }]
});

const validateUpload = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Validate Upload', parameters: { mode: 'runOnceForAllItems', jsCode: __VALIDATE_CODE__ } },
  output: [{ valid: true, error: '', doc_key: 'pricelist', doc_title: 'מחירון', file_name: 'pricelist.md', text: '# מחירון', simulate_fail: '' }]
});

const isValid = ifElse({
  version: 2.2,
  config: { name: 'Upload Valid?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.valid }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } }
});

const respondInvalid = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Respond 400', parameters: { respondWith: 'json', responseBody: expr('{{ { error: $json.error } }}'), options: { responseCode: 400 } } }
});

const createVersion = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    name: 'Create Version', onError: 'continueErrorOutput',
    parameters: { method: 'POST', url: SB + 'create_version', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ p_doc_key: $json.doc_key, p_file_name: $json.file_name }) }}'), options: {} },
    credentials: supabaseCred
  },
  output: [{ id: '00000000-0000-0000-0000-000000000000', doc_key: 'pricelist', version_no: 1, status: 'processing', stage: 'received' }]
});

const respondCreateError = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Respond Create Error', parameters: { respondWith: 'json', responseBody: expr('{{ /409|duplicate|23505/.test(JSON.stringify($json.error ?? $json)) ? { error: "upload_in_progress" } : { error: "שגיאה ביצירת הגרסה" } }}'), options: { responseCode: expr('{{ /409|duplicate|23505/.test(JSON.stringify($json.error ?? $json)) ? 409 : 500 }}') } } }
});

const respondAccepted = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Respond 202', parameters: { respondWith: 'json', responseBody: expr('{{ { upload_id: $json.id, doc_key: $json.doc_key, version_no: $json.version_no } }}'), options: { responseCode: 202 } } }
});

const reportBody = 'JSON.stringify({ p_version_id: $("Create Version").first().json.id, p_stage: ';
const reportChunking = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Report Chunking', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'report_stage', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ ' + reportBody + '"chunking" }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{}]
});

const chunkMarkdown = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Chunk Markdown', onError: 'continueErrorOutput', parameters: { mode: 'runOnceForAllItems', jsCode: __CHUNK_CODE__ } },
  output: [{ section: 'שולחנות אוכל', text: 'מחירון — שולחנות אוכל' }]
});

const reportEmbedding = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Report Embedding', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'report_stage', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ ' + reportBody + '"embedding" }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{}]
});

const restoreChunks = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Restore Chunks', parameters: { mode: 'runOnceForAllItems', jsCode: 'return $("Chunk Markdown").all().map(i => ({ json: i.json }));' } },
  output: [{ section: 'שולחנות אוכל', text: 'מחירון — שולחנות אוכל' }]
});

const chunkEmbeddings = embeddings({
  type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2,
  config: { name: 'Embeddings OpenAI', parameters: { options: {} }, credentials: openAiCred }
});

const noSplit = textSplitter({
  type: '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter', version: 1,
  config: { name: 'No Further Splitting', parameters: { separator: '\u0000', chunkSize: 100000, chunkOverlap: 0 } }
});

const chunkLoader = documentLoader({
  type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1.1,
  config: {
    name: 'Chunk Loader',
    parameters: { dataType: 'json', jsonMode: 'expressionData', jsonData: expr('{{ $json.text }}'), textSplittingMode: 'custom',
      options: { metadata: { metadataValues: [
        { name: 'version_id', value: expr('{{ $("Create Version").first().json.id }}') },
        { name: 'doc_key', value: expr('{{ $("Create Version").first().json.doc_key }}') },
        { name: 'doc_title', value: expr('{{ $("Validate Upload").first().json.doc_title }}') },
        { name: 'version_no', value: expr('{{ $("Create Version").first().json.version_no }}') },
        { name: 'section', value: expr('{{ $json.section }}') },
        { name: 'uploaded_at', value: expr('{{ $now.toISO() }}') }
      ] } } },
    subnodes: { textSplitter: noSplit }
  }
});

const saveChunks = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.3,
  config: {
    name: 'Save Chunks', onError: 'continueErrorOutput',
    parameters: { mode: 'insert', tableName: { __rl: true, mode: 'id', value: 'kb_chunks' }, options: { queryName: 'match_kb_chunks' } },
    credentials: supabaseCred,
    subnodes: { embedding: chunkEmbeddings, documentLoader: chunkLoader }
  }
});

const countSaved = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Count Saved', parameters: { mode: 'runOnceForAllItems', jsCode: 'return [{ json: { saved: $input.all().length, expected: $("Chunk Markdown").all().length, simulate_fail: $("Validate Upload").first().json.simulate_fail } }];' } },
  output: [{ saved: 9, expected: 9, simulate_fail: '' }]
});

const simulateProcessing = ifElse({
  version: 2.2,
  config: { name: 'Simulate Processing Failure?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.simulate_fail }}'), rightValue: 'processing', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' } } }
});

const simulatedProcessingError = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Simulated Processing Error', parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [{ id: 'sim-proc', name: 'error', value: 'כשל מדומה (בדיקה) אחרי שמירת החתיכות', type: 'string' }] } } },
  output: [{ error: 'כשל מדומה' }]
});

const reportVerifying = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Report Verifying', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'report_stage', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ ' + reportBody + '"verifying" }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{}]
});

const verifyVersion = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Verify Version', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'verify_version', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ p_version_id: $("Create Version").first().json.id, p_expected: $("Count Saved").first().json.expected }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{ data: 9 }]
});

const simulateVerifying = ifElse({
  version: 2.2,
  config: { name: 'Simulate Verifying Failure?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $("Validate Upload").first().json.simulate_fail }}'), rightValue: 'verifying', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' } } }
});

const simulatedVerifyingError = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Simulated Verifying Error', parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [{ id: 'sim-ver', name: 'error', value: 'כשל מדומה (בדיקה) בשלב הבדיקה', type: 'string' }] } } },
  output: [{ error: 'כשל מדומה' }]
});

const reportSwapping = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Report Swapping', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'report_stage', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ ' + reportBody + '"swapping" }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{}]
});

const activateVersion = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Activate Version', onError: 'continueErrorOutput', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'activate_version', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ p_version_id: $("Create Version").first().json.id }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{ id: '00000000-0000-0000-0000-000000000000', status: 'active' }]
});

const failVersion = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Fail Version', executeOnce: true,
    parameters: { method: 'POST', url: SB + 'fail_version', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ p_version_id: $("Create Version").first().json.id, p_stage: null, p_error: String($json.error?.message ?? $json.error ?? "שגיאה לא צפויה").slice(0, 500) }) }}'), options: {} },
    credentials: supabaseCred },
  output: [{}]
});

export default workflow('alon-kb', 'נגריית אלון — העלאה ובוט')
  .add(uploadWebhook)
  .to(validateUpload)
  .to(isValid
    .onTrue(createVersion
      .onError(respondCreateError)
      .to(respondAccepted)
      .to(reportChunking.onError(failVersion)
        .to(chunkMarkdown.onError(failVersion)
          .to(reportEmbedding.onError(failVersion)
            .to(restoreChunks)
            .to(saveChunks.onError(failVersion)
              .to(countSaved)
              .to(simulateProcessing
                .onTrue(simulatedProcessingError.to(failVersion))
                .onFalse(reportVerifying.onError(failVersion)
                  .to(verifyVersion.onError(failVersion)
                    .to(simulateVerifying
                      .onTrue(simulatedVerifyingError.to(failVersion))
                      .onFalse(reportSwapping.onError(failVersion)
                        .to(activateVersion.onError(failVersion))))))))))))
    .onFalse(respondInvalid));
