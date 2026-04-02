---
slug: docker-under-the-hood
title: Docker Under the Hood
tags: [docker, learning]
---

# Docker Under the Hood

First things first: Docker is **not** a virtual machine. It provides similar isolation benefits, but without virtualizing an entire operating system the way a VM does. This is a common misconception worth clearing up before we go any further.

So what is Docker, exactly? At its core, it's a process running on your Linux system — one that has been isolated from the rest of the machine in a way that makes it feel entirely self-contained. Instead of emulating a full kernel like a VM does, Docker isolates a single process using primitives built directly into the Linux kernel. Let's dig into how that actually works.

---

## Processes and Isolation

Open a terminal and run `ps aux` — you'll see every process currently running on your machine. By default, these processes can see each other, share the host's filesystem, network interfaces, mount points, and more. Most of the time, that's fine. But when you want to run an application in a fully contained environment, that shared visibility becomes a problem.

Docker solves this by creating a process that is fundamentally deceived by the kernel. Through a mechanism called **namespaces**, the Linux kernel lies to the Docker process, making it believe it is completely alone on the machine — with its own filesystem, its own network, its own process tree. In reality, it's still sharing the same kernel as the host.

To achieve this, Docker leverages Linux **namespaces** and **cgroups**. These two kernel features are the foundation of everything Docker does. Docker is, in essence, a polished interface for managing the isolation that these primitives provide.

> **Note:** Docker is built for Linux. It can run on Windows and macOS, but in those cases Docker automatically provisions a lightweight Linux VM under the hood — because it still needs a Linux kernel to power namespaces and cgroups.

---

## Namespaces

A namespace is a Linux kernel mechanism that gives a process an isolated view of some part of the system. Each namespace creates the illusion that the process owns that resource entirely — its own network stack, its own process IDs, its own hostname — while in reality it's still sharing the underlying kernel with the host.

Docker uses the `clone()` system call (and the `unshare` utility, which wraps it) to create new namespaces when launching a container. Here are the namespaces Docker uses and what each one isolates:

| Namespace | What it isolates |
|-----------|-----------------|
| `pid`     | Process tree (the container gets its own PID 1) |
| `net`     | Network interfaces, routes, and ports |
| `mnt`     | Mount points and filesystem |
| `uts`     | Hostname and domain name |
| `ipc`     | Inter-process communication (message queues, semaphores) |
| `user`    | UID/GID mappings |
| `cgroup`  | Visibility into the container's own cgroup hierarchy |

For filesystem isolation specifically, Docker uses `pivot_root` rather than the older `chroot` command. Both approaches give a process a new root directory, but `pivot_root` is more robust: it fully replaces the root filesystem and removes access to the old one, whereas `chroot` merely changes the directory lookup path and can be escaped under certain conditions. Think of `chroot` as the conceptual ancestor — `pivot_root` is what Docker actually uses in practice.

---

## cgroups

Namespaces handle *visibility* — what a process can see. **cgroups** (control groups) handle *resources* — what a process can *use*.

Docker uses cgroups to enforce limits on CPU time, memory consumption, disk I/O, and more. This is what allows you to run `docker run --memory=256m` or `--cpus=0.5` and have the kernel actually enforce those constraints. Without cgroups, an isolated process could still starve the host of resources.

---

## A Hands-On Demo

Let's replicate what Docker does at a low level. We'll use `debootstrap` to download a minimal Debian filesystem, then launch a namespace-isolated environment from it using `unshare`.

> **Note:** These commands require a Linux machine. The namespace APIs used here are Linux-specific.

### 1. Set up a minimal Debian root filesystem

```bash
sudo apt-get install debootstrap -y
mkdir -p /tmp/debian
sudo debootstrap stable /tmp/debian http://deb.debian.org/debian
```

Once complete, `/tmp/debian` will contain a full Debian directory tree:

```
bin   dev  home  lib64  mnt  proc  run   srv  tmp  var
boot  etc  lib   media  opt  root  sbin  sys  usr
```

### 2. Launch an isolated environment

```bash
sudo unshare --mount --uts --ipc --net --map-root-user --user --pid --fork chroot /tmp/debian bash
```

Once inside, mount the virtual filesystems that any Linux environment needs to function:

```bash
mount -t proc none /proc
mount -t sysfs none /sys
mount -t tmpfs none /tmp
```

> **A note on chroot here:** We're using `chroot` in this demo for simplicity. Docker uses `pivot_root` instead, which is more secure. The behavior is similar enough for demonstration purposes.

### 3. Verify process isolation

Run `ps aux` inside the environment:

```
UID   PID  PPID  C STIME TTY   TIME CMD
root    1     0  0 05:03 ?     0:00 bash
root   27     1  0 06:28 ?     0:00 ps aux
```

Only two processes — `bash` and `ps`. Completely isolated from everything running on the host. ✅

### 4. Verify network isolation

```bash
ip addr
```

```
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

No external network interfaces, because we isolated the network namespace with `--net`. ✅

To see the difference, exit and re-run the `unshare` command *without* the `--net` flag. Inside the new environment, `ip addr` will now show the host's full network interface list — because we left that namespace shared.

---

## Going Further: Resource Limits with cgroups

You can extend this demo to test resource limiting using cgroups directly. The basic approach is to create a cgroup, set limits by writing to its control files, and then associate the cgroup with the PID of your `unshare` process:

```bash
sudo mkdir /sys/fs/cgroup/cpu/my-demo-group
# Write limits to the appropriate files, then assign the PID
```

This requires some familiarity with how Linux manages the cgroup filesystem, but it's a worthwhile exercise. For a thorough walkthrough, <u>[this tutorial from iximiuz](https://labs.iximiuz.com/tutorials/controlling-process-resources-with-cgroups)</u> is excellent. In practice, Docker handles all of this for you through simple flags like `--memory` and `--cpus`.

---

## Conclusion

Docker is a process — nothing more. The kernel uses namespaces to give that process an isolated view of the system, and cgroups to limit the resources it can consume. Everything else Docker provides — images, layers, volumes, the CLI — is built on top of these two primitives.

The official Docker documentation covers the practical side well: how to write Dockerfiles, use Compose, publish images, and manage volumes. What it doesn't explain — and what this article set out to cover — is *why* any of it works. Understanding `unshare`, namespaces, and cgroups gives you a mental model that makes everything else easier to reason about.

**Recommended next steps:**
- [Data persistence with Docker volumes](https://docs.docker.com/engine/storage/volumes)
- [Docker Compose](https://docs.docker.com/compose/) — the right way to manage multi-container setups
- [Docker Hub and publishing images](https://docs.docker.com/docker-hub/)
- [Official getting started workshop](https://docs.docker.com/get-started/workshop/)