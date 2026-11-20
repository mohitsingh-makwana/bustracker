package com.bustrackr.controller;

import com.bustrackr.dto.transportmember.*;
import com.bustrackr.enums.TransportMemberStatus;
import com.bustrackr.service.TransportMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/transport-members")
@RequiredArgsConstructor
public class TransportMemberController {

    private final TransportMemberService transportMemberService;


    @GetMapping("/{id}")
    public ResponseEntity<TransportMemberResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                transportMemberService.getById(id)
        );
    }

    @GetMapping
    public ResponseEntity<Page<TransportMemberResponse>> getAll(@RequestParam(defaultValue = "0")int page,
                                                                @RequestParam(defaultValue = "10")int size,
                                                                @ModelAttribute TransportMemberFilter filter) {

        return ResponseEntity.ok(
                transportMemberService.getAllTransportMembers(page,size,filter)
        );
    }

    @PostMapping("/driver")
    public ResponseEntity<TransportMemberResponse> createDriver(@Valid @RequestBody AdminBasedDriverMembershipRequest driverMembershipRequest){
        return ResponseEntity.ok(transportMemberService.createDriverMember(driverMembershipRequest));
    }

    @PostMapping("/member")
    public ResponseEntity<TransportMemberResponse> createAdmin(@Valid @RequestBody AdminBasedMembershipRequest membershipRequest){
        return ResponseEntity.ok(transportMemberService.createMember(membershipRequest));
    }

    @GetMapping("/me")
    public ResponseEntity<TransportMemberResponse> getAdmin(){
        return ResponseEntity.ok(transportMemberService.getAdmin());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TransportMemberResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateTransportMemberRequest request) {

        return ResponseEntity.ok(
                transportMemberService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        transportMemberService.delete(id);
        return ResponseEntity.noContent().build();
    }



    @GetMapping("/membership-requests")
    public ResponseEntity<Page<TransportMemberResponse>> getMembershipRequests(@RequestParam(required = false) TransportMemberStatus status,
                                                                               @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(
                transportMemberService.getMembershipRequests(status,pageable));
    }


    @PatchMapping("/membership-requests/{memberId}/approve")
    public ResponseEntity<TransportMemberResponse> approveMembership(@PathVariable Long memberId,
                                                                     @Valid @RequestBody ApproveMemberRequest request) {

        return ResponseEntity.ok(
                transportMemberService.approveMembership(memberId, request));
    }


    @PatchMapping("/membership-requests/{memberId}/reject")
    public ResponseEntity<TransportMemberResponse> rejectMembership(@PathVariable Long memberId) {

        return ResponseEntity.ok(
                transportMemberService.rejectMembership(memberId));
    }
}