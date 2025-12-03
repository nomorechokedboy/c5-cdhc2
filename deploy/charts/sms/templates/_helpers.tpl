{{/*
Expand the name of the chart.
*/}}
{{- define "sms.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "sms.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart name + version
*/}}
{{- define "sms.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sms.labels" -}}
helm.sh/chart: {{ include "sms.chart" . }}
{{ include "sms.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels (base)
*/}}
{{- define "sms.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sms.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service Account name (global)
*/}}
{{- define "sms.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sms.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/* ======================================================== */}}
{{/*   API-specific helpers (needed by your API templates)    */}}
{{/* ======================================================== */}}

{{/*
API selector labels
*/}}
{{- define "sms.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sms.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API labels – extends base labels
*/}}
{{- define "sms.api.labels" -}}
{{ include "sms.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API service account name
*/}}
{{- define "sms.api.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (printf "%s-api" (include "sms.fullname" .)) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "sms.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sms.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web labels - extend base labels
*/}}
{{- define "sms.web.labels" -}}
{{ include "sms.labels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web service account name
*/}}
{{- define "sms.web.serviceAccountName" -}}
{{- if .Values.web.serviceAccount.create }}
{{- default (printf "%s-web" (include "sms.fullname" .)) .Values.web.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.web.serviceAccount.name }}
{{- end }}
{{- end }}

