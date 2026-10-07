function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid JSON" })).setMimeType(ContentService.MimeType.JSON);
  }

  var requiredFields = ["pratipadika", "model_word", "linga", "forms", "artha", "artha_eng", "vyutpatti"];
  for (var i = 0; i < requiredFields.length; i++) {
    if (!payload[requiredFields[i]]) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing field: " + requiredFields[i] })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  var GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  var REPO_OWNER = "ravigopalbhat";
  var REPO_NAME = "Samasanam";
  var FILE_PATH = "data/user_suggestions.json";
  var BRANCH = "main";

  if (!GITHUB_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "GitHub token not configured" })).setMimeType(ContentService.MimeType.JSON);
  }

  var getUrl = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + FILE_PATH + "?ref=" + BRANCH;
  var getOptions = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + GITHUB_TOKEN,
      "Accept": "application/vnd.github.v3+json"
    },
    muteHttpExceptions: true
  };

  var getResponse = UrlFetchApp.fetch(getUrl, getOptions);
  var getResponseCode = getResponse.getResponseCode();
  var getResponseBody = getResponse.getContentText();

  if (getResponseCode !== 200) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Failed to fetch file: " + getResponseBody })).setMimeType(ContentService.MimeType.JSON);
  }

  var fileData = JSON.parse(getResponseBody);
  var sha = fileData.sha;
  var currentContent = Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString();
  var suggestions = [];
  try {
    suggestions = JSON.parse(currentContent);
  } catch (err) {
    suggestions = [];
  }

  var newEntry = {
    "urlid": "@" + payload.pratipadika,
    "word": payload.pratipadika,
    "linga": payload.linga || "",
    "artha": payload.artha || "",
    "artha_hin": "",
    "artha_eng": payload.artha_eng || "",
    "sk": "",
    "lsk": "",
    "vyutpatti": payload.vyutpatti || "",
    "shabda_notes": "Model: " + (payload.model_word || ""),
    "info": "User Suggestion",
    "prakriya_options": { "linga": payload.linga || "" },
    "forms": payload.forms || "",
    "zbaseindex": "",
    "timestamp": new Date().toISOString()
  };

  suggestions.push(newEntry);

  var newContent = JSON.stringify(suggestions, null, 2);
  var encodedContent = Utilities.base64Encode(newContent);

  var putUrl = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + FILE_PATH;
  var putOptions = {
    method: "put",
    headers: {
      "Authorization": "Bearer " + GITHUB_TOKEN,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({
      message: "Add user suggestion: " + payload.pratipadika,
      content: encodedContent,
      sha: sha,
      branch: BRANCH
    }),
    muteHttpExceptions: true
  };

  var putResponse = UrlFetchApp.fetch(putUrl, putOptions);
  var putResponseCode = putResponse.getResponseCode();
  var putResponseBody = putResponse.getContentText();

  if (putResponseCode === 200 || putResponseCode === 201) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Word suggestion added successfully" })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ error: "Failed to update file: " + putResponseBody })).setMimeType(ContentService.MimeType.JSON);
  }
}