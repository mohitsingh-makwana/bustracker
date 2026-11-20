package com.bustrackr.controller;

import com.bustrackr.dto.user.UpdateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;


    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(userService.getById(id));
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAll(@RequestParam(defaultValue = "0")int page,
                                                     @RequestParam(defaultValue = "10")int size) {

        return ResponseEntity.ok(userService.getAll(page,size));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {

        return ResponseEntity.ok(
                userService.update(id, request)
        );
    }

}