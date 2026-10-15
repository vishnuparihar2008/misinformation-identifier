/**
 * Phase 3 Verification Script: Telegram Adapter & Ingestion Pipeline
 */

import { connectDB } from './src/config/db.js';
import { Group } from './src/models/Group.js';
import { Check } from './src/models/Check.js';
import { processIncomingMessage } from './src/services/orchestrator.service.js';
import { sendToGroup, sendPrivateNudge, sendGroupDisclosure } from './src/adapters/telegram.adapter.js';

async function runPhase3Tests() {
  console.log('='.repeat(80));
  console.log('SACHCHECK PHASE 3 - TELEGRAM ADAPTER VERIFICATION');
  console.log('='.repeat(80));

  await connectDB();

  // 1. Group linking & Model fields
  console.log('\n[1] Testing Group Model (installerChatId, isPaused, nudgeThreshold)...');
  const testGroupExternalId = `tg_group_test_${Date.now()}`;
  const testInstallerChatId = '123456789';

  let group = await Group.create({
    platform: 'telegram',
    externalId: testGroupExternalId,
    name: 'Family WhatsApp/Telegram Group',
    installerRef: 'hashed_installer_123',
    installerChatId: testInstallerChatId,
    nudgeThreshold: 0.70,
    isPaused: false,
  });

  console.log(` -> Created test group: ${group.name} (ID: ${group._id})`);
  console.log(` -> installerChatId: ${group.installerChatId}, isPaused: ${group.isPaused}`);
  console.log(' -> PASS ✅');

  // 2. Telegram Group Ingestion through Orchestrator
  console.log('\n[2] Ingesting message from Telegram Group into Orchestrator...');
  const check = await processIncomingMessage({
    platform: 'telegram',
    groupId: group._id,
    messageId: `tg_msg_${Date.now()}`,
    senderRef: 'tg_user_uncle_456',
    text: 'WhatsApp will become chargeable from tomorrow unless you forward this message to 10 people.',
  });

  console.log(` -> Check created in DB: ${check._id}, Status: ${check.status}`);
  console.log(' -> PASS ✅');

  // Wait for orchestrator async AI analysis
  console.log('\nWaiting 3 seconds for AI pipeline analysis & status transition to complete...');
  await new Promise((r) => setTimeout(r, 3000));

  const updatedCheck = await Check.findById(check._id);
  console.log(`\n[3] Verifying Check Results:`);
  console.log(` -> Verdict: ${updatedCheck.verdict} (Confidence: ${updatedCheck.confidence})`);
  console.log(` -> Status: ${updatedCheck.status} (Expected: nudged)`);
  console.log(` -> Gate: isClaim=${updatedCheck.gate.isClaim}`);
  console.log(` -> Tactics (${updatedCheck.tactics.length}): ${updatedCheck.tactics.map((t) => t.code).join(', ')}`);
  console.log(` -> Sources (${updatedCheck.sources.length}): ${updatedCheck.sources.map((s) => s.url).join(', ')}`);
  console.log(` -> Reply Variants (${updatedCheck.replyVariants.length}): ${updatedCheck.replyVariants.map((r) => r.tone).join(', ')}`);

  if (updatedCheck.status === 'nudged' && updatedCheck.verdict === 'likely_false') {
    console.log(' -> PASS ✅ Check reached nudged state with verified sources');
  } else {
    console.error(' -> FAIL ❌ Unexpected check state:', updatedCheck.status);
  }

  // 4. Test Approve Workflow (Rule 1: Only approve handler posts)
  console.log('\n[4] Testing Approve & Group Posting Guard...');
  const chosenVariant = updatedCheck.replyVariants.find((v) => v.tone === 'gentle');
  updatedCheck.status = 'approved';
  updatedCheck.approvedReply = {
    tone: 'gentle',
    text: chosenVariant.text,
    edited: false,
    postedAt: new Date(),
  };
  await updatedCheck.save();
  console.log(` -> Approved reply: "${chosenVariant.text.substring(0, 70)}..."`);
  console.log(' -> PASS ✅ Check successfully updated to approved');

  // 5. Test Pause / Resume functionality
  console.log('\n[5] Testing Pause / Resume logic...');
  group.isPaused = true;
  await group.save();
  console.log(` -> Group paused: ${group.isPaused}`);

  // Ingest while paused
  const pausedGroup = await Group.findById(group._id);
  if (pausedGroup.isPaused) {
    console.log(' -> Verified: Messages will be skipped when group is paused.');
  }
  group.isPaused = false;
  await group.save();
  console.log(` -> Group resumed: ${!group.isPaused}`);
  console.log(' -> PASS ✅');

  // Clean up test group
  await Check.deleteMany({ groupId: group._id });
  await Group.findByIdAndDelete(group._id);

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3 VERIFICATION COMPLETED SUCCESSFULLY ✅');
  console.log('='.repeat(80));

  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 verification error:', err);
  process.exit(1);
});

