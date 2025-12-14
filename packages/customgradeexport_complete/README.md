# Custom Grade Export Plugin for Moodle 5.0

Export quiz and assignment grades with institution and department information in Excel (.xls) or Word (.docx) format.

## Features

- ✅ Export Quiz grades to Excel or DOCX
- ✅ Export Assignment grades to Excel or DOCX
- ✅ Include Institution and Department columns
- ✅ Custom DOCX template support
- ✅ Vietnamese character support
- ✅ Template management interface

## Quick Installation

### Step 1: Clone PHPWord Library

```bash
cd /path/to/moodle/local/customgradeexport/vendor

# Clone PHPWord
git clone https://github.com/PHPOffice/PHPWord.git phpoffice/phpword
cd phpoffice/phpword
git checkout 1.2.0

# Clone Laminas Escaper (dependency)
cd ../..
git clone https://github.com/laminas/laminas-escaper.git laminas/laminas-escaper
cd laminas/laminas-escaper
git checkout 2.13.0
```

### Step 2: Upload Plugin

Upload this entire directory to: `/moodle/local/customgradeexport`

### Step 3: Install

```bash
php admin/cli/upgrade.php
php admin/cli/purge_caches.php
```

## Alternative: Use Setup Script

```bash
cd /path/to/moodle/local/customgradeexport
chmod +x setup_vendor.sh
./setup_vendor.sh
```

## Usage

1. Go to any Quiz or Assignment activity
2. Click "Export grades (Custom)" button
3. Choose format: Excel or Word
4. Download file

## Template Management (Administrators)

Access: `/local/customgradeexport/upload_template.php?type=quiz`

Upload custom DOCX templates with variables like:
- `${firstname}`, `${lastname}`, `${institution}`, `${department}`
- `${grade}`, `${percentage}`, `${status}`

## File Structure

```
customgradeexport/
├── version.php
├── lib.php
├── lang/en/local_customgradeexport.php
├── db/access.php
├── classes/
│   ├── privacy/provider.php
│   ├── docx_exporter.php
│   ├── template_processor.php
│   ├── quiz_export_helper.php
│   └── assign_export_helper.php
├── vendor/
│   ├── phpoffice/phpword/        (git clone)
│   ├── laminas/laminas-escaper/  (git clone)
│   └── autoload.php
├── quiz_export.php
├── assign_export.php
└── upload_template.php
```

## Requirements

- Moodle 5.0+
- PHP 8.1+
- Git (for cloning PHPWord)

## Support

See INSTALLATION_GUIDE.md for detailed instructions and troubleshooting.
