package com.bustrackr.service;

import com.bustrackr.dto.auth.LoginRequest;
import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.auth.UserVerificationRequest;
import com.bustrackr.dto.auth.UserVerificationResponse;
import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;

@Service
public interface AuthService {

    public UserResponse register(CreateUserRequest request);

    public LoginResponse login(LoginRequest request);

    String sendOtp(@NotNull String email);

    UserVerificationResponse verify(@NotNull UserVerificationRequest request);
}
