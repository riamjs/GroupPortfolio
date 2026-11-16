package com.aet.portfolio.controller;

import com.aet.portfolio.config.SiteProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@EnableConfigurationProperties(SiteProperties.class)
public class ClassroomController {
    private final SiteProperties classroom;

    public ClassroomController(SiteProperties classroom) {
        this.classroom = classroom;
    }

    @GetMapping("/api/site/classroom")
    public SiteProperties classroom() {
        return classroom;
    }
}
