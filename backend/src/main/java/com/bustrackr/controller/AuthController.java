package com.bustrackr.controller;

import com.bustrackr.dto.auth.LoginRequest;
import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.auth.UserVerificationRequest;
import com.bustrackr.dto.auth.UserVerificationResponse;
import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody CreateUserRequest request) {

        UserResponse userResponse=authService.register(request);
        return ResponseEntity.status(
                userResponse!=null? HttpStatus.CREATED : HttpStatus.BAD_REQUEST
                )
                .body(userResponse);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<String> sendOtp(@NotNull @RequestParam  String email) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.sendOtp(email));
    }

    @PostMapping("/verify")
    public ResponseEntity<UserVerificationResponse> verify(@NotNull @RequestBody UserVerificationRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.verify(request));
    }


    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.status(HttpStatus.OK)
                .body(authService.login(request));
    }


}
