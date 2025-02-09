const admin = require('firebase-admin');

// טען את קובץ המפתח
const serviceAccount = require('./service-account-key.json');

// אתחל את Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// שלח הודעה לטוקן ספציפי עם נתונים מהמסמך החדש
const sendNotification = async (title, body) => {
  const deviceToken = 'eKXoSkU5QBWyY7i_xrGO3s:APA91bGATNb7dkb4LwM7xBjwKS3PBJl8hRl1UCI3iVS2HkbwAyvqGi1_j_XXPDCZFBnGPe3aTeSxB0Rx_povD6ef1An1mnf7052Fd7RYolhby_6lg4nv14Y';
  const message = {
    token: deviceToken,
    notification: {
      title: title,
      body: body,
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// האזן לשינויים בקולקציה מסוימת
db.collection('notifications').onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const newDoc = change.doc.data();
      const docId = change.doc.id; // קבל את שם המסמך (Document ID)
      console.log('New document added:', newDoc); 
      console.log('id',docId) ;// הוסף בדיקה כדי לוודא שהנתונים נמשכים כראוי
      const title = newDoc.title|| 'No Title';
      const id = newDoc|| 'No id';
      const body = newDoc.body || 'No Body';
      sendNotification(title, body);
    }
  });
});