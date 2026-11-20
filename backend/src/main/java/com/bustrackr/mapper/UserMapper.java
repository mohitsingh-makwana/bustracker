package com.bustrackr.mapper;

import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UpdateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final PasswordEncoder passwordEncoder;

    public User toEntity(CreateUserRequest request) {
        return User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .phone(request.phone())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
    }

    public void updateEntity(UpdateUserRequest request, User entity) {

        if (request.email() != null) {
            entity.setEmail(request.email());
        }

        if (request.phone() != null) {
            entity.setPhone(request.phone());
        }
    }

    public UserResponse toResponse(User entity) {
        return new UserResponse(
                entity.getId(),
                entity.getFullName(),
                entity.getEmail(),
                entity.getPhone(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}