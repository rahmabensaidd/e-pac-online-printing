package tn.epac.eprinting.service;


import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.epac.eprinting.model.entities.Order;
import tn.epac.eprinting.model.entities.User;
import tn.epac.eprinting.model.enums.OrderStatus;
import tn.epac.eprinting.repository.OrderRepository;
import tn.epac.eprinting.repository.UserRepository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;


    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }}