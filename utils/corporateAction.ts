import { queryDB } from "@/utils/db";

/**
 * Call BulkUpsertCorpActionLogs procedure after successful corporate action operations
 * This procedure updates corporate action logs based on current holdings
 */
export async function callBulkUpsertCorpActionLogs(): Promise<void> {
  try {
    console.log(`Calling BulkUpsertCorpActionLogs procedure`);

    // Call the BulkUpsertCorpActionLogs procedure
    await queryDB({
      query: `CALL ritefolio."BulkUpsertCorpActionLogs"($1, $2, $3)`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null, // p_profile_id
        null, // p_demat_account_id (can be null)
        null, // p_corporate_action_id (null for bulk operations)
      ],
    });

    console.log(`Successfully executed BulkUpsertCorpActionLogs`);
  } catch (error) {
    // Log error but don't fail the operation - corporate action logs are supplementary
    console.error(
      `Failed to execute BulkUpsertCorpActionLogs: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    console.warn(
      "Corporate action operation succeeded but corporate action logs update failed"
    );
  }
}
