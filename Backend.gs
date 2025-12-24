// ================= CONFIGURATION =================
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Replace with your Sheet ID
const SHEET_NAME = 'Database';
const API_SECRET = 'YOUR_SECURE_API_SECRET';  // Must match Frontend
// =============================================

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const postData = JSON.parse(e.postData.contents);
    const payload = postData.payload;
    const signature = postData.signature;
    const timestamp = postData.timestamp;

    // 1. Security: Anti-Replay Check (60s window)
    const currentTime = new Date().getTime();
    if (!timestamp || Math.abs(currentTime - timestamp) > 60000) {
      throw new Error("Security Error: Request Timeout (Potential Replay Attack)");
    }

    // 2. Security: HMAC Signature Verification
    if (!isValidSignature(payload + timestamp, signature)) {
      throw new Error("Security Error: Invalid Signature or Unauthorized Access");
    }

    // 3. Database Operations
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const requestData = JSON.parse(payload);
    const action = requestData.action;
    let result = {};

    // --- CREATE ---
    if (action === 'create') {
      const id = new Date().getTime().toString();
      // Store the encrypted object string directly
      sheet.appendRow([id, JSON.stringify(requestData.data), new Date()]);
      result = { status: 'success', message: 'Data Saved Securely', id: id };
    }

    // --- READ (Lazy Loading) ---
    else if (action === 'read') {
      const offset = parseInt(requestData.offset) || 0;
      const limit = parseInt(requestData.limit) || 10;
      
      const lastRow = sheet.getLastRow();
      const startRow = offset + 2; // +2 because Row 1 is header
      
      if (startRow > lastRow) {
        result = { status: 'success', data: [], hasMore: false };
      } else {
        const rowsAvailable = (lastRow - startRow) + 1;
        const actualLimit = Math.min(limit, rowsAvailable);
        
        // Fetch only required rows
        const rows = sheet.getRange(startRow, 1, actualLimit, 2).getValues();
        
        const data = rows.map(row => ({
          id: row[0],
          encryptedData: JSON.parse(row[1])
        }));

        result = { 
          status: 'success', 
          data: data, 
          hasMore: (startRow + actualLimit - 1) < lastRow 
        };
      }
    }

    // --- DELETE ---
    else if (action === 'delete') {
      const idToFind = requestData.id.toString();
      const ids = sheet.getRange("A:A").getValues();
      let foundRow = -1;
      
      for(let i=1; i<ids.length; i++){
        if(ids[i][0].toString() === idToFind){
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        sheet.deleteRow(foundRow);
        result = { status: 'success', message: 'Deleted Successfully' };
      } else {
        result = { status: 'error', message: 'ID Not Found' };
      }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Helper: HMAC Signature Generator
function isValidSignature(data, signature) {
  const computed = Utilities.computeHmacSha256Signature(data, API_SECRET);
  const hex = computed.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  return hex === signature;
}
