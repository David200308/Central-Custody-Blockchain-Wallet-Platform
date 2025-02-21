package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"os"

	"crypto/ecdsa"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"

	"database/sql"

	"encoding/asn1"
	"encoding/hex"
	"encoding/pem"

	"net/http"

	kms "cloud.google.com/go/kms/apiv1"
	"cloud.google.com/go/kms/apiv1/kmspb"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go"

	"github.com/ethereum/go-ethereum/crypto"
	_ "github.com/mattn/go-sqlite3"
)

type kmsClientCtxKey string
type kmsPublicKeyPemCtxKey string
type dbClientCtxKey string
type firebaseClientCtxKey string
type firestoreClientCtxKey string

const keyVersionName = "projects/wallet-platform/locations/us-central1/keyRings/key-service/cryptoKeys/wallet-service/cryptoKeyVersions/1"

var ctx = context.Background()

const kmsClientCtxKeyString = kmsClientCtxKey("kmsClientCtxKey")
const kmsPublicKeyPemString = kmsPublicKeyPemCtxKey("kmsPublicKeyPem")
const dbClientCtxKeyString = dbClientCtxKey("dbClientCtxKey")
const firebaseClientCtxKeyString = firebaseClientCtxKey("firebaseClientCtxKey")
const firestoreClientCtxKeyString = firestoreClientCtxKey("firestoreClientCtxKey")

var secp256k1N = crypto.S256().Params().N
var secp256k1HalfN = new(big.Int).Div(secp256k1N, big.NewInt(2))

func kmsClient() *kms.KeyManagementClient {
	return ctx.Value(kmsClientCtxKeyString).(*kms.KeyManagementClient)
}
func publicEncryptionKey() string {
	return ctx.Value(kmsPublicKeyPemString).(string)
}
func setupKMS() {
	client, err := kms.NewKeyManagementClient(ctx)
	if err != nil {
		log.Fatalf("failed to create new KeyManagementClient: %s", err.Error())
	}
	ctx = context.WithValue(ctx, kmsClientCtxKeyString, client)
	log.Println("Setup KMS")
	// Get the key
	publicKey, err := kmsClient().GetPublicKey(ctx, &kmspb.GetPublicKeyRequest{
		Name: keyVersionName,
	})
	if err != nil {
		log.Fatalf("bruh moment on GetPublicKey %s", err.Error())
	}
	ctx = context.WithValue(ctx, kmsPublicKeyPemString, publicKey.Pem)
	log.Println("Setup encryption public key")
}

func dbClient() *sql.DB {
	return ctx.Value(dbClientCtxKeyString).(*sql.DB)
}
func setupSQLite() {
	db, err := sql.Open("sqlite3", "./keys.db")
	if err != nil {
		log.Fatalf("failed to open database: %s", err.Error())
	}
	ctx = context.WithValue(ctx, dbClientCtxKeyString, db)
	err = db.Ping()
	if err != nil {
		log.Fatalf("failed to ping db: %s", err.Error())
	}
	_, err = db.Exec(
		`CREATE TABLE IF NOT EXISTS user_keys (
			uid CHAR(28) NOT NULL,
			privateKey CHAR(64) NOT NULL,
			PRIMARY KEY (uid)
		);`)
	if err != nil {
		log.Fatalf("creating table failed: %s", err.Error())
	}
	log.Println("Setup SQLite")
}

//	func firebaseClient() *firebase.App {
//		return ctx.Value(firebaseClientCtxKeyString).(*firebase.App)
//	}
func firestoreClient() *firestore.Client {
	return ctx.Value(firestoreClientCtxKeyString).(*firestore.Client)
}
func setupFirebase() {
	firebase, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatalf("error initializing firebase: %s", err.Error())
	}
	ctx = context.WithValue(ctx, firebaseClientCtxKeyString, firebase)
	log.Println("Setup firebase client")
	firestore, err := firebase.Firestore(ctx)
	if err != nil {
		log.Fatalf("error initializing firestore: %s", err.Error())
	}
	ctx = context.WithValue(ctx, firestoreClientCtxKeyString, firestore)
	log.Println("Setup firestore client")
}

func respondOk(w http.ResponseWriter, res []byte) {
	w.WriteHeader(200)
	w.Write(res)
}

func respondError(w http.ResponseWriter, str string, v ...any) {
	w.WriteHeader(500)
	w.Write([]byte(fmt.Sprintf(str, v...)))
}

func encryptKey(privateKey *ecdsa.PrivateKey) ([]byte, error) {
	pemBlock, _ := pem.Decode([]byte(publicEncryptionKey()))
	if pemBlock == nil {
		return nil, errors.New("could not decode public key")
	}

	parsedPublicKey, err := x509.ParsePKIXPublicKey(pemBlock.Bytes)
	if err != nil {
		return nil, errors.New("error parsing key: " + err.Error())
	}
	return rsa.EncryptOAEP(sha256.New(), rand.Reader, parsedPublicKey.(*rsa.PublicKey), privateKey.D.Bytes(), nil)
}

func decryptKey(encodedKey string) (string, error) {
	log.Printf("Decoding key: %s", encodedKey)
	hexCipher, err := hex.DecodeString(encodedKey)
	if err != nil {
		return "", errors.New("error decoding from hex string: " + err.Error())
	}
	decryptResp, err := kmsClient().AsymmetricDecrypt(ctx, &kmspb.AsymmetricDecryptRequest{
		Name:       keyVersionName,
		Ciphertext: hexCipher,
	})
	if err != nil {
		return "", errors.New("error with asymmetric decrypt: " + err.Error())
	}
	return hex.EncodeToString(decryptResp.Plaintext), nil
}

func getKeyStringFromDB(uid string) (string, error) {
	rows, err := dbClient().Query("SELECT privateKey FROM user_keys WHERE uid = ?", uid)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	nextRowReady := rows.Next()
	if rows.Err() != nil {
		return "", errors.New("error in rows: " + rows.Err().Error())
	}
	if !nextRowReady {
		return "", errors.New("no key with uid")
	}

	var privateKeyString string
	if err := rows.Scan(&privateKeyString); err != nil {
		return "", errors.New("error scanning for privateKey: " + err.Error())
	}
	return privateKeyString, nil
}

func getEncryptedKeyFromFirestore(uid string) (string, error) {
	docSnap, err := firestoreClient().Doc(fmt.Sprintf("encryptedKeys/%s", uid)).Get(ctx)
	if err != nil {
		return "", errors.New("error from firestore: " + err.Error())
	}
	encryptedKeyData, err := docSnap.DataAt("encryptedKey")
	if err != nil {
		return "", errors.New("error getting data from docSnap: " + err.Error())
	}
	return encryptedKeyData.(string), nil
}

func getKeyFromUid(uid string) (*ecdsa.PrivateKey, error) {
	privateKeyString, err := getKeyStringFromDB(uid)
	if privateKeyString == "" || err != nil { // or is redundant but better for readability
		encryptedPrivateKeyString, errFirestore := getEncryptedKeyFromFirestore(uid)
		if errFirestore != nil {
			return nil, errors.Join(err, errFirestore)
		}
		privateKeyString, errFirestore = decryptKey(encryptedPrivateKeyString)
		if errFirestore != nil {
			return nil, errors.Join(err, errFirestore)
		}
		insertId, errFirestore := insertKeyInDB(uid, privateKeyString)
		if errFirestore != nil {
			return nil, errors.Join(err, errFirestore)
		}
		log.Printf("Inserted key: %d", insertId)
	}

	privateKeyBytes := make([]byte, 32)
	_, err = hex.Decode(privateKeyBytes, []byte(privateKeyString))
	if err != nil {
		return nil, errors.New("error decoding private key: " + err.Error())
	}

	ecdsaKey, err := crypto.ToECDSA(privateKeyBytes)
	if err != nil {
		return nil, errors.New("error converting to ecdsa key: " + err.Error())
	}

	return ecdsaKey, nil
}

func insertKeyInDB(uid string, key string) (int64, error) {
	insertResult, err := dbClient().Exec(`INSERT INTO user_keys VALUES (?, ?)`, uid, key)
	if err != nil {
		return -1, errors.New("insert failed: " + err.Error())
	}
	lastInsertId, err := insertResult.LastInsertId()
	if err != nil {
		return -1, errors.New("no insert ID: " + err.Error())
	}
	return lastInsertId, nil
}

func insertEncryptedKeyInFirestore(uid string, encryptedKey string) (*firestore.WriteResult, error) {
	return firestoreClient().Doc(fmt.Sprintf("encryptedKeys/%s", uid)).Create(ctx, map[string]interface{}{
		"encryptedKey": encryptedKey,
	})
}

type asn1EcSig struct {
	R asn1.RawValue
	S asn1.RawValue
}

func (signature *asn1EcSig) getRS() (string, string) {
	rHexString, sBytes := hex.EncodeToString(signature.R.Bytes), signature.S.Bytes
	sBigInt := new(big.Int).SetBytes(sBytes)
	if sBigInt.Cmp(secp256k1HalfN) > 0 {
		sBytes = new(big.Int).Sub(secp256k1N, sBigInt).Bytes()
	}
	sHexString := hex.EncodeToString(sBytes)
	return rHexString[len(rHexString)-64:], sHexString[len(sHexString)-64:]
}

func signingHandler(w http.ResponseWriter, r *http.Request) {
	digest, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, "failed to get body")
		return
	}
	uid := r.PathValue("uid")
	if uid == "" {
		respondError(w, "missing uid")
		return
	}

	privateKey, err := getKeyFromUid(uid)
	if err != nil {
		respondError(w, "getting key failed: %s", err.Error())
		return
	}
	digestHexBytes, err := hex.DecodeString(string(digest))
	if err != nil {
		respondError(w, "error decoding hex string")
		return
	}
	signature, err := privateKey.Sign(rand.Reader, digestHexBytes, nil)
	if err != nil {
		respondError(w, "signing failed")
		return
	}

	var signatureComponents asn1EcSig
	_, err = asn1.Unmarshal(signature, &signatureComponents)
	if err != nil {
		respondError(w, "unmarshal failed")
		return
	}

	rHexStr, sHexStr := signatureComponents.getRS()
	// jank way to make it an array so .json() in TypeScript works
	respondOk(w, []byte(fmt.Sprintf("[\"0x%s\", \"0x%s\"]", rHexStr, sHexStr)))
}

func generateKeyHandler(w http.ResponseWriter, r *http.Request) {
	uid := r.PathValue("uid")
	if uid == "" {
		respondError(w, "missing uid")
		return
	}
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		respondError(w, "error generating private key %s", err.Error())
		return
	}
	privateKeyHexString := hex.EncodeToString(privateKey.D.Bytes())
	log.Printf("private key: %s", privateKeyHexString)

	encryptedKey, err := encryptKey(privateKey)
	if err != nil {
		respondError(w, "error encrypting private key: %s", err.Error())
		return
	}
	hexEncryptedKey := hex.EncodeToString(encryptedKey)

	lastInsertId, err := insertKeyInDB(uid, privateKeyHexString)
	if err != nil {
		respondError(w, "error inserting into DB: %s", err.Error())
		return
	}
	log.Printf("Insert ID: %d", lastInsertId)

	writeResult, err := insertEncryptedKeyInFirestore(uid, hexEncryptedKey)
	if err != nil {
		respondError(w, "error inserting into Firestore: %s", err.Error())
		return
	}
	log.Printf("Write time: %s", writeResult.UpdateTime.GoString())
	respondOk(w, []byte(crypto.PubkeyToAddress(privateKey.PublicKey).Hex()))
}

func getAddressHandler(w http.ResponseWriter, r *http.Request) {
	uid := r.PathValue("uid")
	if uid == "" {
		respondError(w, "missing uid")
		return
	}
	privateKey, err := getKeyFromUid(uid)
	if err != nil {
		respondError(w, "error getting key from uid")
		return
	}
	respondOk(w, []byte(crypto.PubkeyToAddress(privateKey.PublicKey).Hex()))
}

func main() {
	// Create the Key Management Client and defer resource termination
	setupKMS()
	defer kmsClient().Close()
	// Create the database connection and defer resource termination
	setupSQLite()
	defer dbClient().Close()
	// Create Firebase app and Firestore client
	setupFirebase()
	defer firestoreClient().Close()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("root requested from %s", r.RemoteAddr)
		respondOk(w, []byte("all good"))
	})
	http.HandleFunc("POST /sign/{uid}", signingHandler)
	http.HandleFunc("POST /generateKey/{uid}", generateKeyHandler)
	http.HandleFunc("GET /getAddress/{uid}", getAddressHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3100"
		log.Printf("defaulting to port %s", port)
	}

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Printf("error in ListenAndServe: %s", err.Error())
	}
}
