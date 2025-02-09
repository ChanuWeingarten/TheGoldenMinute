import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, Alert, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Notification } from 'firebase-admin/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  Alert.alert('hi!!!', 'Message handled in the background!');

  // כאן תוכל להוסיף קוד לטיפול בהודעות רקע
});

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceToken, setDeviceToken] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<Notification | undefined>(undefined);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // בדיקה שה-Firebase מאותחל
    if (!auth().app) {
      console.error('Firebase not initialized!');
    }

    const getTokenAndSubscribe = async () => {
      try {
        // בקשת הרשאה לקבלת הודעות
        console.log('Requesting permission...');
        const authStatus = await messaging().requestPermission();
        if (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        ) {
          console.log('Authorization granted');

          // קבלת טוקן
          console.log('Fetching token...');
          const token = await messaging().getToken();
          console.log('Device Token:', token);
          setDeviceToken(token);

          // הרשמה לנושא (Topic)
          console.log('Subscribing to topic: allDevices...');
          await messaging().subscribeToTopic('allDevices');
          console.log('Subscribed to topic: allDevices');
        } else {
          console.log('Authorization denied');
        }
      } catch (error) {
        console.error('Error fetching token or subscribing to topic:', error);
      }
    };

    // מאזין להודעות כאשר האפליקציה פתוחה
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', remoteMessage);
      console.log('Message data:', remoteMessage.data);
      console.log('Message notification:', remoteMessage.notification);
      setNotificationData(remoteMessage.notification);
      setModalVisible(true);
    });

    getTokenAndSubscribe();

    // ניקוי מאזינים כאשר הקומפוננטה מפסיקה לפעול
    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  const validateInputs = () => {
    if (!email || !password || (isSignUp && !area)) {
      Alert.alert('Error', 'Please enter email, password, and select an area');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);
      console.log('Attempting signup with:', email); // דיבאג

      const response = await auth().createUserWithEmailAndPassword(email, password);
      console.log('Firebase Response:', response); // דיבאג

      // שמירת המשתמש בקולקציה users בפיירסטור
      await firestore().collection('users').doc(response.user.uid).set({
        email: response.user.email,
        area: area,
      });

      Alert.alert('Success', 'User created successfully!');
      setEmail('');
      setPassword('');
      setArea('');
      setUser(response.user);

    } catch (error: any) {
      let errorMessage = 'An error occurred during sign up';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email is already registered';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      console.error('Sign up error:', error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);
      console.log('Attempting login with:', email); // דיבאג
      const response = await auth().signInWithEmailAndPassword(email, password);
      console.log('Login Response:', response); // דיבאג

      Alert.alert('Success', 'Logged in successfully!');
      setEmail('');
      setPassword('');
      setUser(response.user);

    } catch (error: any) {
      let errorMessage = 'An error occurred during login';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Invalid password';
            break;
          default:
            errorMessage = error.message;
        }
      }

      console.error('Login error:', error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionPress = async (option: string) => {
    console.log('Option selected:', option);
    try {
      if (user && user.email) {
        await firestore().collection('status').doc(user.email).set({
          selectedOption: option,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.error('User is null or email is undefined');
      }
      console.log('Data added to Firestore with document ID "user":', option);
    } catch (error) {
      console.error('Error adding document:', error);
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      
      {!user ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
          {isSignUp && (
            <>
              <Text style={styles.label}>Select Area:</Text>
              <View style={styles.areaContainer}>
                <TouchableOpacity
                  style={[styles.areaButton, area === 'גבעה A' && styles.selectedAreaButton]}
                  onPress={() => setArea('גבעה A')}
                  disabled={isLoading}
                >
                  <Text style={styles.areaButtonText}>גבעה A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.areaButton, area === 'גבעה B' && styles.selectedAreaButton]}
                  onPress={() => setArea('גבעה B')}
                  disabled={isLoading}
                >
                  <Text style={styles.areaButtonText}>גבעה B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.areaButton, area === 'גבעה C' && styles.selectedAreaButton]}
                  onPress={() => setArea('גבעה C')}
                  disabled={isLoading}
                >
                  <Text style={styles.areaButtonText}>גבעה C</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={styles.buttonContainer}>
            {isSignUp ? (
              <>
                <Button title="Sign Up" onPress={handleSignUp} disabled={isLoading} />
                <Button title="Switch to Login" onPress={() => setIsSignUp(false)} disabled={isLoading} />
              </>
            ) : (
              <>
                <Button title="Login" onPress={handleLogin} disabled={isLoading} />
                <Button title="Switch to Sign Up" onPress={() => setIsSignUp(true)} disabled={isLoading} />
              </>
            )}
          </View>
        </>
      ) : (
        <Text>Welcome, {user.email}</Text>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {notificationData && (
              <>
                <Text style={styles.modalText}>{notificationData.title}</Text>
                <Text style={styles.modalText}>{notificationData.body}</Text>
              </>
            )}
            <TouchableOpacity
              style={[styles.button, styles.buttonGreen]}
              onPress={() => handleOptionPress('אני בסדר')}
            >
              <Text style={styles.textStyle}>אני בסדר</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonWhite]}
              onPress={() => handleOptionPress('אני לא באזור')}
            >
              <Text style={styles.textStyle}>אני לא באזור</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonRed]}
              onPress={() => handleOptionPress('אני צריך עזרה')}
            >
              <Text style={styles.textStyle}>אני צריך עזרה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonYellow]}
              onPress={() => handleOptionPress('אני שומע שיש בעיה')}
            >
              <Text style={styles.textStyle}>אני שומע שיש בעיה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  label: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  areaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  areaButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  selectedAreaButton: {
    backgroundColor: '#ddd',
  },
  areaButtonText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginVertical: 5,
    width: 200,
  },
  buttonGreen: {
    backgroundColor: 'green',
  },
  buttonWhite: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
  },
  buttonRed: {
    backgroundColor: 'red',
  },
  buttonYellow: {
    backgroundColor: 'yellow',
  },
  textStyle: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default App;