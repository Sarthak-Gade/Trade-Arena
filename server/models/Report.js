const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['contract_note', 'daily_summary'], default: 'contract_note' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  pdfPath: { type: String, required: true }, // File path on server
  pdfUrl: { type: String, required: true }, // Web URL / API endpoint for downloading
  emailSent: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
