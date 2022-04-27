use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rust_wasm_test::*;
use screeps::{prelude::*, Position, RoomName, RoomPosition};

fn hashmap_add(n: usize) {
    let mut x = RoomPositionCollection_HashMap::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn hashmap_remove(n: usize) {
    let mut x = RoomPositionCollection_HashMap::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
    for i in 0..n {
        x.remove(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn hashmap_contains(n: usize) {
    let mut x = RoomPositionCollection_HashMap::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
    for i in 0..n - 50 {
        x.contains(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn hashset_packed_add(n: usize) {
    let mut x = RoomPositionCollection_HashSetPacked::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn hashset_packed_remove(n: usize) {
    let mut x = RoomPositionCollection_HashSetPacked::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
    for i in 0..n {
        x.remove(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn hashset_packed_contains(n: usize) {
    let mut x = RoomPositionCollection_HashSetPacked::new();
    for i in 0..n {
        x.add(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
    for i in 0..n - 50 {
        x.contains(RoomPosition::new(
            i as u32 % 50,
            i as u32 % 50,
            RoomName::new("E0N0").unwrap(),
        ));
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("Add [HashMap]", |b| b.iter(|| hashmap_add(black_box(100))));
    c.bench_function("Remove [HashMap]", |b| {
        b.iter(|| hashmap_remove(black_box(100)))
    });
    c.bench_function("Contains [HashMap]", |b| {
        b.iter(|| hashmap_contains(black_box(150)))
    });

    c.bench_function("Add [HashSetPacked]", |b| {
        b.iter(|| hashset_packed_add(black_box(100)))
    });
    c.bench_function("Remove [HashSetPacked]", |b| {
        b.iter(|| hashset_packed_remove(black_box(100)))
    });
    c.bench_function("Contains [HashSetPacked]", |b| {
        b.iter(|| hashset_packed_contains(black_box(150)))
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
