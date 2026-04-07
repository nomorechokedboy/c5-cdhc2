<?php

namespace local_customgradeexport;

use PhpOffice\PhpWord\TemplateProcessor;
use PhpOffice\PhpWord\Shared\Text;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\Escaper\Xml;

class fixed_template_processor extends TemplateProcessor
{
    public function setValue($search, $replace, $limit = self::MAXIMUM_REPLACEMENTS_DEFAULT): void
    {
        if (is_array($search)) {
            foreach ($search as &$item) {
                $item = static::ensureMacroCompleted($item);
            }
            unset($item);
        } else {
            $search = static::ensureMacroCompleted($search);
        }

        if (is_array($replace)) {
            foreach ($replace as &$item) {
                $item = ($item !== null && $item !== '') ? Text::toUTF8($item) : '';
            }
            unset($item);
        } else {
            // ← key fix: only convert non-empty, but keep '0' as '0'
            $replace = ($replace !== null && $replace !== '') ? Text::toUTF8($replace) : '';
        }

        if (Settings::isOutputEscapingEnabled()) {
            $xmlEscaper = new Xml();
            $replace = $xmlEscaper->escape($replace);
        }

        $this->tempDocumentHeaders  = $this->setValueForPart($search, $replace, $this->tempDocumentHeaders, $limit);
        $this->tempDocumentMainPart = $this->setValueForPart($search, $replace, $this->tempDocumentMainPart, $limit);
        $this->tempDocumentFooters  = $this->setValueForPart($search, $replace, $this->tempDocumentFooters, $limit);
    }
}
