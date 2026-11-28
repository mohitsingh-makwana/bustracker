package com.bustrackr.service.impl;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;


import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Properties;

@Service
@Slf4j
public class EmailService {

    private final Gmail gmail;


    private final String fromAddress;

    public EmailService(@Value("${gmail.sender}")String fromAddress, Gmail gmail) {
        this.fromAddress=fromAddress;
        this.gmail = gmail;
    }


    @Async
    public void sendRegistrationOtpEmail(String toEmail, String otp, int validityMinutes) {
        String subject = "BusTrackr - Your verification code";
        String body = """
                Hello,
 
                Your BusTrackr verification code is: %s
 
                This code is valid for %d minutes. Enter it on the registration
                page to confirm that this email address belongs to you.
 
                Do not share this code with anyone. If you did not try to register
                on BusTrackr, you can safely ignore this email.
 
                Regards,
                Team BusTrackr
                """.formatted(otp, validityMinutes);
        send(toEmail, subject, body);
    }

    @Async
    public void sendRequestAcceptedEmail(String toEmail, String memberName,String transportSystemName) {
        String subject = "BusTrackr - Your request has been accepted";
        String body = """
                Hello %s,

                Good news! Your request to join %s has been accepted.
                You will receive your account details in a separate email shortly.

                Regards,
                Team BusTrackr
                """.formatted(memberName,transportSystemName);
        send(toEmail, subject, body);
    }


    @Async
    public void sendRequestRejectedEmail(String toEmail, String memberName,String transportSystemName) {
        String subject = "BusTrackr - Your request has been rejected";
        String body = """
                Hello %s,

                We are sorry to inform you that your request to join %s.
                has been rejected.

                If you think this was a mistake, please contact the administrator.

                Regards,
                Team BusTrackr
                """.formatted(memberName,transportSystemName);
        send(toEmail, subject, body);
    }


    @Async
    public void sendAccountCreatedEmail(String toEmail, String memberName,
                                        String role, String defaultPassword,String transportSystemName) {
        String subject = "BusTrackr - Your account has been created";
        String body = """
                Hello %s,

                Your BusTrackr account has been created as a %s in %s.

                Login email     : %s
                Default password: %s

                This is your default password. Please change it as soon as
                possible after your first login.

                Regards,
                Team BusTrackr
                """.formatted(memberName, role,transportSystemName, toEmail, defaultPassword);
        send(toEmail, subject, body);
    }

    @Async
    public void sendMemberAccountCreatedEmail(String toEmail, String memberName, String role,String transportSystemName) {
        String subject = "BusTrackr - Your account has been created";
        String body = """
                Hello %s,
 
                Your BusTrackr account has been created as a %s in %s.
 
                Login email: %s
 
                You can now log in and start using BusTrackr.
 
                Regards,
                Team BusTrackr
                """.formatted(memberName, role, transportSystemName,toEmail);
        send(toEmail, subject, body);
    }


    private void send(String to, String subject, String text) {
        try {
            Session session = Session.getInstance(new Properties());
            MimeMessage mime = new MimeMessage(session);
            mime.setFrom(new InternetAddress(fromAddress, "BusTrackr"));
            mime.setRecipients(jakarta.mail.Message.RecipientType.TO, InternetAddress.parse(to));
            mime.setSubject(subject, "UTF-8");
            mime.setText(text, "UTF-8");

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            mime.writeTo(buffer);
            String raw = Base64.getUrlEncoder().encodeToString(buffer.toByteArray());

            Message message = new Message();
            message.setRaw(raw);

            gmail.users().messages().send("me", message).execute();
            log.info("Email sent to {}", to);
        } catch (MessagingException | IOException | RuntimeException e) {
            // Don't break the main flow (accept/reject/create) if the mail fails
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }


}