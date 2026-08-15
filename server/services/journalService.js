const Journal = require('../models/Journal');

const addJournalEntry = async (userId, journalData) => {
  const journal = new Journal({
    user: userId,
    trade: journalData.tradeId,
    symbol: journalData.symbol ? journalData.symbol.toUpperCase() : undefined,
    entryReason: journalData.entryReason,
    exitReason: journalData.exitReason,
    strategy: journalData.strategy,
    notes: journalData.notes,
    learnings: journalData.learnings
  });
  
  await journal.save();
  return journal;
};

const getJournalEntries = async (userId) => {
  return await Journal.find({ user: userId }).populate('trade').sort({ createdAt: -1 });
};

module.exports = {
  addJournalEntry,
  getJournalEntries
};
