package com.bustrackr.entity;

import com.bustrackr.enums.DriverStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "drivers")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "transport_member_id",
            nullable = false,
            unique = true
    )
    TransportMember transportMember;

    @Column(nullable = false,  length = 40)
    String name;

    @Column(nullable = false,length = 40)
    String address;


    @Column(nullable = false, unique = true, length = 30)
    String licenseNumber;

    @Column(nullable = false)
    LocalDate licenseExpiryDate;

    @Column(name="driver_status")
    @Enumerated(EnumType.STRING)
    DriverStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    LocalDateTime updatedAt;

    @Version
    private Long version;

    Boolean active=true;
}