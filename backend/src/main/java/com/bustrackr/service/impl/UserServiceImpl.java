package com.bustrackr.service.impl;

import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UpdateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.entity.User;
import com.bustrackr.exception.ResourceAlreadyExistException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.UserMapper;
import com.bustrackr.repository.UserRepository;
import com.bustrackr.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse create(CreateUserRequest request) {
        User user = userMapper.toEntity(request);

        log.info("Saving user={}",user);
        userRepository.save(user);
        log.info("User saved....");

        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse getById(Long id) {
        User user=userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id="+id));

        return userMapper.toResponse(user);
    }

    @Override
    public Page<UserResponse> getAll(int page, int size) {
        Pageable pageable= PageRequest.of(page, size);
        Page<User> users=userRepository.findAll(pageable);
        return users.map(userMapper::toResponse);
    }

    @Override
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user=userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id="+id));
        userMapper.updateEntity(request,user);
        return userMapper.toResponse(userRepository.save(user));
    }

}
