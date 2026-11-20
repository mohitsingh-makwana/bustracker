package com.bustrackr.service.impl;


import com.bustrackr.dto.auth.LoginRequest;
import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.auth.UserVerificationRequest;
import com.bustrackr.dto.auth.UserVerificationResponse;
import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.entity.User;
import com.bustrackr.mapper.UserMapper;
import com.bustrackr.repository.UserRepository;
import com.bustrackr.security.AuthUtil;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.service.AuthService;
import com.bustrackr.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final AuthUtil authUtil;
    private final UserService userService;
    private final EmailService emailService;
    private final OtpService otpService;

    @Override
    public UserResponse register(CreateUserRequest request) {
        log.info("Request reached in register...");
        if(authUtil.validateVerificationToken(request.verificationToken())==null){
            return null;
        }
        log.info("token is sent by frontend in request...");
        return userService.create(request);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        UsernamePasswordAuthenticationToken authenticationToken=new UsernamePasswordAuthenticationToken(request.username(),request.password());
        Authentication authentication=authenticationManager.authenticate(authenticationToken);

        CustomUserDetails customUserDetails=(CustomUserDetails) authentication.getPrincipal();

         String token=authUtil.generateUserToken(customUserDetails.getUsername());

        return LoginResponse.builder()
                .token(token)
                .msg("Access Granted")
                .build();
    }

    @Override
    public String sendOtp(String email) {
        String otp=otpService.generateOtp();
        if (!otpService.storeOtp(email, otp)) return "Otp already sent!";
        emailService.sendRegistrationOtpEmail(email, otp, 2);

        return "Otp sent!";
    }

    @Override
    public UserVerificationResponse verify(UserVerificationRequest request) {
          String storedOtp=otpService.getOtp(request.email());

        if(storedOtp!=null && storedOtp.equals(otpService.normalize(request.otp()))){

            String verificationToken=authUtil.generateUserVerificationToken(request.email());
            log.info("Otp matched and token generated");
            //deleting the otp after verification
            otpService.deleteOtp(request.email());


            return new UserVerificationResponse(request.email(),verificationToken,"otp verified successfully!");
        }

        return new UserVerificationResponse(request.email(),null,"Otp verification failed!");
    }
}
