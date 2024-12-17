function doGet() {
  var template = HtmlService.createTemplateFromFile('index');
  var output = template.evaluate()
    .setTitle('Consumer Form')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}


function uploadFile(base64Data, fileName) {
  // Ensure base64Data is valid
  if (!base64Data) {
    throw new Error('Invalid image data provided.');
  }

  // Check if the input is already a URL (existing image)
  if (typeof base64Data === 'string' && base64Data.startsWith('https://')) {
    // Return the same URL if no new upload is needed
    return base64Data;
  }

  // Process Base64 data for a new image
  const folder = DriveApp.getFolderById(' HERE YOUR GOOGLE DRIVE SHARE FOLDER ID');
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', fileName);
  const file = folder.createFile(blob);

  // Set sharing permission
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Return thumbnail URL
  return `https://drive.google.com/thumbnail?id=${file.getId()}`;
}



function submitForm(formData) {
  const reportSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ConsumerDetails');

  if (formData.rowIndex) {
    // Update existing record
    const rowIndex = parseInt(formData.rowIndex);
    const existingImageUrl = reportSheet.getRange(rowIndex + 1, 6).getFormula().match(/"([^"]+)"/)?.[1] || '';

    const newImageUrl = formData.imageUrl || existingImageUrl;
    const range = reportSheet.getRange(rowIndex + 1, 1, 1, 6);
    range.setValues([[
      formData.name,
      formData.address,
      formData.mobileno,
      formData.age,
      formData.gender,
      `=IMAGE("${newImageUrl}", 4, 200, 200)`
    ]]);
  } else {
    // Append new record
    const rowIndex = reportSheet.getLastRow() + 1;
    reportSheet.appendRow([
      formData.name,
      formData.address,
      formData.mobileno,
      formData.age,
      formData.gender
    ]);

    // Insert the image in the last column of the new row
    const imageCell = reportSheet.getRange(rowIndex, 6);
    imageCell.setFormula(`=IMAGE("${formData.imageUrl}", 4, 200, 200)`);
  }

  return 'true';
}


function getConsumerData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ConsumerDetails');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove header row

  return data.map((row, index) => ({
    name: row[0],
    address: row[1],
    mobileno: row[2],
    age: row[3],
    gender: row[4],
    imageUrl: extractImageUrl(sheet, index + 2, 6) // Adjust for header row
  }));
}

function getConsumerRecord(rowIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ConsumerDetails');
  const row = sheet.getRange(rowIndex+1, 1, 1, 6).getValues()[0];

  // Extract the image URL using the updated extractImageUrl function
  const imageUrl = extractImageUrl(sheet, rowIndex+1, 6);

  Logger.log(`Extracted Image URL: ${imageUrl}`);

  return {
    name: row[0],
    address: row[1],
    mobileno: row[2],
    age: row[3],
    gender: row[4],
    imageUrl: imageUrl
  };
}

function extractImageUrl(sheet, rowIndex, columnIndex) {
  const formula = sheet.getRange(rowIndex, columnIndex).getFormula();
  
  // Check if the cell has a formula
  if (formula) {
    const match = formula.match(/=IMAGE\("([^"]+)"(?:,.*)?\)/i);
    if (match) {
      return match[1]; // Return the URL inside the IMAGE formula
    }
  }

  // If no formula, check if the cell has a plain URL (via getValue())
  const value = sheet.getRange(rowIndex, columnIndex).getValue();
  if (typeof value === 'string' && value.startsWith('http')) {
    return value; // Return plain URL if present
  }

  // If neither formula nor plain URL, return empty or a default value
  return '';
}

