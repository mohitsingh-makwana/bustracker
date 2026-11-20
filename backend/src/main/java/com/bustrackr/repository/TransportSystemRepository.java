package com.bustrackr.repository;

import com.bustrackr.entity.TransportSystem;
import com.bustrackr.enums.AccessType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransportSystemRepository extends JpaRepository<TransportSystem,Long>,JpaSpecificationExecutor<TransportSystem> {
    Optional<TransportSystem> findByIdAndAccessType(Long id, AccessType accessType);

    Page<TransportSystem> findAllByAccessType(AccessType accessType, Pageable pageable);
}
