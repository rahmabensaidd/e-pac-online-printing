package tn.epac.eprinting.model.dtos;

import org.springframework.data.domain.Page;

import java.util.List;

public record PagedResponseDto<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int size,
        int number
) {
    public static <T> PagedResponseDto<T> from(Page<T> page) {
        return new PagedResponseDto<>(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getSize(),
                page.getNumber()
        );
    }
}

