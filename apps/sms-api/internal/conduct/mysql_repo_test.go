package conduct

import (
	"context"
	"os"
	"testing"

	"github.com/pocketbase/dbx"
)

// The repository test needs a real MySQL. Point SMS_TEST_DSN at a scratch
// database (go-sql-driver DSN, parseTime=true); the test is skipped without it.
func TestMySQLRepositoryRoundTrip(t *testing.T) {
	dsn := os.Getenv("SMS_TEST_DSN")
	if dsn == "" {
		t.Skip("SMS_TEST_DSN not set")
	}
	db, err := dbx.MustOpen("mysql", dsn)
	if err != nil {
		t.Fatal(err)
	}
	if err := RunMigrations(db); err != nil {
		t.Fatal(err)
	}
	const category = 987654
	cleanup := func() { db.Delete("sms_conduct", dbx.HashExp{"category_id": category}).Execute() }
	cleanup()
	t.Cleanup(cleanup)

	repo := NewMySQLRepository(db)
	ctx := context.Background()

	if err := repo.Save(ctx, category, 1, []Entry{
		{StudentID: 10, Year: 1, Semester: 1, Score: ptr(8.5)},
		{StudentID: 11, Year: 1, Semester: 1, Score: ptr(7)},
	}); err != nil {
		t.Fatal(err)
	}
	// Overwrite one, delete the other.
	if err := repo.Save(ctx, category, 2, []Entry{
		{StudentID: 10, Year: 1, Semester: 1, Score: ptr(9)},
		{StudentID: 11, Year: 1, Semester: 1},
	}); err != nil {
		t.Fatal(err)
	}

	got, err := repo.List(ctx, category)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].StudentID != 10 || got[0].Score != 9 {
		t.Fatalf("scores = %+v, want one score of 9 for student 10", got)
	}
}
