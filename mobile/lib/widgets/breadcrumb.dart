import 'package:flutter/material.dart';

class Breadcrumb extends StatelessWidget {
  final List<String> paths;

  const Breadcrumb({super.key, required this.paths});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: paths.asMap().entries.map((entry) {
            final index = entry.key;
            final path = entry.value;
            final isLast = index == paths.length - 1;

            return Row(
              children: [
                Text(
                  path,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isLast ? FontWeight.w800 : FontWeight.w600,
                    color: isLast
                        ? const Color(0xFF1e293b)
                        : const Color(0xFF94a3b8),
                  ),
                ),
                if (!isLast)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8.0),
                    child: Icon(Icons.chevron_right,
                        size: 14, color: Color(0xFFcbd5e1)),
                  ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}
