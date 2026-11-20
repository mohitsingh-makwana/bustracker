package com.bustrackr.specification;

import com.bustrackr.entity.Bus;
import com.bustrackr.enums.BusStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class BusSpecification implements Specification<Bus> {


    public static Specification<Bus> hasId(Long id){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("id"),id);
    }

    public static Specification<Bus> isActive(Boolean b){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("active"),b);
    }

    public static Specification<Bus> hasTransportSystemId(Long transportSystemId){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("transportSystem").get("id"),transportSystemId);
    }

    public static Specification<Bus> hasStatus(BusStatus status){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"),status);
    }
    public static Specification<Bus> hasBusNumberLike(String busNumber) {
        return (root, query, cb) ->
                cb.like(
                        cb.lower(root.get("busNumber")),
                        "%" + busNumber.toLowerCase() + "%"
                );
    }
    public static Specification<Bus> hasBusNumber(String busNumber) {
        return (root, query, cb) ->
                cb.equal(root.get("busNumber"), busNumber);
    }
    public static Specification<Bus> hasRegistrationNumber(String registerNum) {
        return (root, query, cb) ->
                cb.like(
                        cb.lower(root.get("registrationNumber")),
                        "%" + registerNum.toLowerCase() + "%"
                );
    }

    public static Specification<Bus> hasModel(String model){
        return (root, query, cb) ->
                cb.equal(root.get("model"),model);
    }
    public static Specification<Bus> hasLastServiceDate(LocalDate lastDate){
        return (root, query, cb) ->
                cb.equal(root.get("lastServiceDate"),lastDate);
    }

    public static Specification<Bus> hasNextServiceDate(LocalDate nextDate){
        return (root, query, cb) ->
                cb.equal(root.get("nextServiceDate"),nextDate);
    }



    @Override
    public @Nullable Predicate toPredicate(Root root, CriteriaQuery query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
