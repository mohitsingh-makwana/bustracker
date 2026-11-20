package com.bustrackr.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {


    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;


    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
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
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(message);
        } catch (MessagingException | RuntimeException e) {
            // Don't break the main flow (accept/reject/create) if the mail fails
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}