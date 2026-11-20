package com.bustrackr.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex){

        Map<String,String > errors=new HashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error->errors.put(error.getField(),error.getDefaultMessage()));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .message("Validation failed")
                        .statusCode(HttpStatus.BAD_REQUEST.value())
                        .errors(errors)
                        .build()
        );
    }



    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(DataIntegrityViolationException ex){


        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }


    @ExceptionHandler(OsrmDistanceException.class)
    public ResponseEntity<ErrorResponse> handleDataOsrmDistanceException(OsrmDistanceException ex){


        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.INTERNAL_SERVER_ERROR.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ErrorResponse> handleInvalidInputException(InvalidRequestException ex){

               return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex){

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex){

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }
    @ExceptionHandler(NoLiveLocationFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoLiveLocationFoundException(NoLiveLocationFoundException ex){

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.NOT_FOUND.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleCredentialException(BadCredentialsException ex){

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }


    @ExceptionHandler(NoTransportMemberException.class)
    public ResponseEntity<ErrorResponse> handleNoTransportMemberException(NoTransportMemberException ex){

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.BAD_REQUEST.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }
    @ExceptionHandler(MemberRoleMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMemberRoleMismatchException(MemberRoleMismatchException ex){

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.FORBIDDEN.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex){

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.NOT_FOUND.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(ResourceAlreadyExistException.class)
    public ResponseEntity<ErrorResponse> handleResourceAlreadyExistException(ResourceAlreadyExistException ex){

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.CONFLICT.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(ResourceNotAvailableException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotAvailableException(ResourceNotAvailableException ex){

        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.NO_CONTENT.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }

    @ExceptionHandler(ScheduleOverlappingException.class)
    public ResponseEntity<ErrorResponse> handleScheduleOverlappingException(ScheduleOverlappingException ex){

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(
                        ErrorResponse.builder()
                                .timestamp(LocalDateTime.now())
                                .message(ex.getMessage())
                                .statusCode(HttpStatus.CONFLICT.value())
                                .errors(Collections.emptyMap())
                                .build()
                );
    }





    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                 ErrorResponse.builder()
                         .timestamp(LocalDateTime.now())
                         .message(exception.getMessage())
                         .statusCode(HttpStatus.BAD_REQUEST.value())
                         .errors(Collections.emptyMap())
                         .build()
                );
    }


    }
