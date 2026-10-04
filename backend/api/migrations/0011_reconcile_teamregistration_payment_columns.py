from django.db import migrations


def add_missing_teamregistration_columns(apps, schema_editor):
    table_name = "api_teamregistration"
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        description = connection.introspection.get_table_description(cursor, table_name)
        existing_columns = {column.name for column in description}

    missing_columns = [
        (
            "payment_order_id",
            "ALTER TABLE api_teamregistration ADD COLUMN payment_order_id varchar(100) NOT NULL DEFAULT ''",
        ),
        (
            "payment_id",
            "ALTER TABLE api_teamregistration ADD COLUMN payment_id varchar(100) NOT NULL DEFAULT ''",
        ),
        (
            "payment_signature",
            "ALTER TABLE api_teamregistration ADD COLUMN payment_signature varchar(255) NOT NULL DEFAULT ''",
        ),
        (
            "payment_amount_paise",
            "ALTER TABLE api_teamregistration ADD COLUMN payment_amount_paise integer unsigned NOT NULL DEFAULT 0",
        ),
        (
            "payment_currency",
            "ALTER TABLE api_teamregistration ADD COLUMN payment_currency varchar(10) NOT NULL DEFAULT 'INR'",
        ),
    ]

    for column_name, sql in missing_columns:
        if column_name not in existing_columns:
            schema_editor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_teamregistration_file_fields"),
    ]

    operations = [
        migrations.RunPython(
            add_missing_teamregistration_columns,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
