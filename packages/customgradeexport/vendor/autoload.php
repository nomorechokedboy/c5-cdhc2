<?php
/**
 * Autoloader for PHPWord and dependencies
 * 
 * This file loads PHPWord and Laminas Escaper from the vendor directory.
 * These libraries must be cloned via git:
 * 
 * git clone --depth 1 --branch 1.2.0 https://github.com/PHPOffice/PHPWord.git phpoffice/phpword
 * git clone --depth 1 --branch 2.13.0 https://github.com/laminas/laminas-escaper.git laminas/laminas-escaper
 * 
 * Or run: ./setup_vendor.sh
 */

// PHPWord autoloader
spl_autoload_register(function ($class) {
    $prefix = 'PhpOffice\\PhpWord\\';
    $base_dir = __DIR__ . '/phpoffice/phpword/src/PhpWord/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});

// Laminas Escaper autoloader
spl_autoload_register(function ($class) {
    $prefix = 'Laminas\\Escaper\\';
    $base_dir = __DIR__ . '/laminas/laminas-escaper/src/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});
