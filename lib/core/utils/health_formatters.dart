class HealthFormatters {
  static String formatTime(DateTime value) {
    final local = value.toLocal();
    final minute = local.minute.toString().padLeft(2, '0');
    final meridiem = local.hour >= 12 ? 'PM' : 'AM';
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    return '$hour:$minute $meridiem';
  }

  static String formatDate(DateTime value) {
    final local = value.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    return '${local.year}-$month-$day';
  }

  static String formatDateTime(DateTime value) {
    return '${formatDate(value)} ${formatTime(value)}';
  }

  static String formatRelativeDay(DateTime value) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(value.year, value.month, value.day);
    final diffDays = today.difference(target).inDays;

    if (diffDays == 0) return 'Today';
    if (diffDays == 1) return 'Yesterday';
    return formatDate(value);
  }

  static String formatRecordType(String type) {
    final normalized = type.trim().toLowerCase();
    if (normalized.isEmpty) return 'Health record';
    return humanize(normalized.replaceAll('_', ' '));
  }

  static String humanize(String raw) {
    return raw
        .split(RegExp(r'[\s_-]+'))
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  static String statusLabel(String status) {
    final normalized = status.trim().toLowerCase();
    if (normalized == 'anchored' || normalized == 'verified') {
      return 'Verified';
    }
    if (normalized == 'local_hash_only') {
      return 'Verified Locally';
    }
    if (normalized == 'tampered' || normalized == 'anchor_mismatch') {
      return 'Needs Review';
    }
    return 'Pending';
  }

  static String sentenceCase(String value) {
    final cleaned = value.trim();
    if (cleaned.isEmpty) return '';
    final normalized = cleaned.replaceAll('_', ' ').toLowerCase();
    return normalized[0].toUpperCase() + normalized.substring(1);
  }
}
