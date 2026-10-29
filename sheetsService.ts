export interface WaitlistEntry {
  name: string;
  email: string;
  collegeOrCompany: string;
  role: 'Organiser' | 'Sponsor';
}

export interface SheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

const STORAGE_KEY_ID = 'sponsrmitra_waitlist_sheet_id';
const STORAGE_KEY_URL = 'sponsrmitra_waitlist_sheet_url';

export const getStoredSheetInfo = (): { id: string | null; url: string | null } => {
  return {
    id: localStorage.getItem(STORAGE_KEY_ID),
    url: localStorage.getItem(STORAGE_KEY_URL),
  };
};

export const setStoredSheetInfo = (id: string, url: string) => {
  localStorage.setItem(STORAGE_KEY_ID, id);
  localStorage.setItem(STORAGE_KEY_URL, url);
};

export const clearStoredSheetInfo = () => {
  localStorage.removeItem(STORAGE_KEY_ID);
  localStorage.removeItem(STORAGE_KEY_URL);
};

/**
 * Ensures a Google Sheet exists for SponsrMitra waitlist submissions.
 * Checks existing sheet id or creates a new one with required columns:
 * Timestamp, Name, Email, College/Company, Role.
 */
export const getOrCreateWaitlistSheet = async (accessToken: string): Promise<SheetInfo> => {
  const { id: existingId, url: existingUrl } = getStoredSheetInfo();

  if (existingId) {
    try {
      const verifyRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${existingId}?fields=spreadsheetId,spreadsheetUrl,properties.title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        const url = data.spreadsheetUrl || existingUrl || `https://docs.google.com/spreadsheets/d/${existingId}/edit`;
        setStoredSheetInfo(data.spreadsheetId, url);
        return {
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: url,
          title: data.properties?.title || 'SponsrMitra Waitlist',
        };
      }
    } catch {
      // If verification fails, proceed to create a new sheet
    }
  }

  // Create a new Google Spreadsheet
  const createPayload = {
    properties: {
      title: 'SponsrMitra Fest Waitlist',
    },
    sheets: [
      {
        properties: {
          title: 'Waitlist',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 5,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: 'Timestamp' },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.91, green: 0.86, blue: 0.76 },
                    },
                  },
                  {
                    userEnteredValue: { stringValue: 'Name' },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.91, green: 0.86, blue: 0.76 },
                    },
                  },
                  {
                    userEnteredValue: { stringValue: 'Email' },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.91, green: 0.86, blue: 0.76 },
                    },
                  },
                  {
                    userEnteredValue: { stringValue: 'College/Company' },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.91, green: 0.86, blue: 0.76 },
                    },
                  },
                  {
                    userEnteredValue: { stringValue: 'Role' },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.91, green: 0.86, blue: 0.76 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to create spreadsheet (HTTP ${createRes.status})`;
    throw new Error(message);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  setStoredSheetInfo(spreadsheetId, spreadsheetUrl);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: sheetData.properties?.title || 'SponsrMitra Fest Waitlist',
  };
};

/**
 * Appends a new row to the SponsrMitra Google Sheet:
 * Columns: Timestamp, Name, Email, College/Company, Role
 */
export const appendWaitlistEntry = async (
  accessToken: string,
  entry: WaitlistEntry
): Promise<{ spreadsheetUrl: string }> => {
  const sheetInfo = await getOrCreateWaitlistSheet(accessToken);

  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const appendPayload = {
    range: 'Waitlist!A:E',
    majorDimension: 'ROWS',
    values: [
      [
        timestamp,
        entry.name.trim(),
        entry.email.trim(),
        entry.collegeOrCompany.trim(),
        entry.role,
      ],
    ],
  };

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetInfo.spreadsheetId}/values/Waitlist!A:E:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appendPayload),
    }
  );

  if (!appendRes.ok) {
    const errorData = await appendRes.json().catch(() => ({}));
    const message = errorData?.error?.message || `Could not write entry to Google Sheet (HTTP ${appendRes.status})`;
    throw new Error(message);
  }

  return { spreadsheetUrl: sheetInfo.spreadsheetUrl };
};
