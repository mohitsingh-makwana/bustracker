package com.bustrackr.tools;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.gmail.GmailScopes;

import java.io.File;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * One-time local tool. Run its main method from IntelliJ to authorize your Gmail
 * account and obtain a refresh token. It is never called by the Spring application.
 */
public final class GmailOAuthTokenGenerator {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = List.of(GmailScopes.GMAIL_SEND);
    private static final Path CREDENTIALS_FILE = Path.of("backend/credentials.json");
    private static final File TOKENS_DIR = new File("tokens");
    private static final int CALLBACK_PORT = 8888;

    private GmailOAuthTokenGenerator() {
    }

    public static void main(String[] args) throws Exception {
        if (!Files.exists(CREDENTIALS_FILE)) {
            System.err.println("credentials.json not found in: " + CREDENTIALS_FILE.toAbsolutePath());
            System.err.println("Put it in the backend folder, or set the IntelliJ working directory to it.");
            return;
        }

        NetHttpTransport transport = GoogleNetHttpTransport.newTrustedTransport();

        try (Reader reader = Files.newBufferedReader(CREDENTIALS_FILE)) {
            GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, reader);

            GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                    transport, JSON_FACTORY, clientSecrets, SCOPES)
                    .setDataStoreFactory(new FileDataStoreFactory(TOKENS_DIR))
                    .setAccessType("offline")
                    .setApprovalPrompt("force")
                    .build();

            LocalServerReceiver receiver = new LocalServerReceiver.Builder()
                    .setPort(CALLBACK_PORT)
                    .build();

            Credential credential = new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");

            String refreshToken = credential.getRefreshToken();
            if (refreshToken == null || refreshToken.isBlank()) {
                System.err.println("No refresh token returned.");
                System.err.println("Remove this app at https://myaccount.google.com/permissions, delete the 'tokens' folder, and run again.");
                return;
            }

            System.out.println("Authorization successful.");
            System.out.println("Refresh token (store it as an environment variable, never in Git):");
            System.out.println(refreshToken);
        }
    }
}