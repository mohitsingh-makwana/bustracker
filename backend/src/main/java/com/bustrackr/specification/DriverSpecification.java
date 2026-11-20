package com.bustrackr.specification;

import com.bustrackr.entity.Driver;
import com.bustrackr.enums.DriverStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class DriverSpecification implements Specification<Driver> {


    public static Specification<Driver> hasId(Long id){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"),id);
    }

    public static Specification<Driver> hasMemberId(Long id){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("transportMember").get("id"),id);
    }

    public static Specification<Driver> isActive(Boolean b){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("active"),b);
    }

    public static Specification<Driver> hasLicenseNumber(String licenseNumber){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("licenseNumber"),licenseNumber);
    }

    public static Specification<Driver> hasNameLike(String name){
        return (root, query, cb) ->cb.like(cb.lower(root.get("name")),"%"+name.toLowerCase()+"%");
    }

    public static Specification<Driver> hasAddressLike(String address){
        return (root, query, cb) ->cb.like(cb.lower(root.get("address")),"%"+address.toLowerCase()+"%");
    }

    public static Specification<Driver> hasStatus(DriverStatus status){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"),status);
    }

    public static Specification<Driver> hasMemberIds(List<Long> memberIds) {
        return (root, query, criteriaBuilder) -> root.get("transportMember").get("id").in(memberIds);
    }

    @Override
    public @Nullable Predicate toPredicate(Root<Driver> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
