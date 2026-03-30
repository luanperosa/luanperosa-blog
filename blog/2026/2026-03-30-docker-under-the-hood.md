---
slug: docker-under-the-hood
title: Understanding Docker Under the Hood
tags: [docker, learning]
---

# Understanding Docker Under the Hood

First things first: Docker is **not** a virtual machine. It provides the same isolation benefits, but without needing to virtualize an entire operating system like a VM does.

I'm starting with this because it's a common misconception — and a completely wrong one. So with that out of the way, let's talk about what Docker actually is. **It's just a process running on your Linux system.** At the end of the day, this means Docker can isolate your application in a completely self-contained way — similar in result to a VM, but instead of virtualizing an entire kernel, we're isolating a single process. Let's dig deeper into that.

Open your terminal, run `ps aux` — you'll see every process currently running on your machine. Think of each process as an open Chrome tab, or a bash terminal session. By default, OS processes can at least see each other, share visibility of the system and have access to the host's mount points, filesystem, network interfaces, and so on. But the Docker process is created in a way that it **can't see** anything outside itself. In short, the **Kernel is lying to the Docker process** — through the power of **Namespaces** — making it believe it's completely alone. (In the exercise below we'll see this mechanism working)

To do this, Docker leverages the Linux `unshare` command and Linux namespaces. Everything Docker does revolves around this. Docker is essentially a friendlier way to manage the isolation that `unshare` provides.

**Note:** Docker is built to run on Linux. It can absolutely run on Windows and macOS, but in those cases, Docker automatically installs a lightweight Linux VM under the hood — because it still needs a Linux kernel to power all the namespace and cgroup magic described above.

---

## Namespaces and cgroups

Docker uses **process isolation via namespaces** and also allows you to **limit resources like memory and CPU via cgroups**.

A **Namespace** is a Linux kernel mechanism that makes a process see only an isolated slice of the system. Each namespace creates the _illusion that the entire system belongs to it_ — its own network, processes, hostname, and filesystem. But in reality, it's still sharing the same kernel as the host machine (even though it can't see that).

Docker uses namespaces (via `unshare`/`clone`) for isolating: PID, Network, Filesystem (`mnt`), UTS, IPC, and User. It uses **cgroups** to limit CPU, memory, and other resource usage. It also uses **`pivot_root` + User Namespaces** for root filesystem isolation — an evolution of the older `chroot` concept.

> **Note on `chroot`:** Think of it as the mechanism that gives the Docker process its own directory, making it feel like it's "alone" in there.

### Namespaces Docker uses:

|Namespace|What it isolates|
|---|---|
|`pid`|Processes (each container gets its own PID tree)|
|`net`|Network interfaces, routes, and ports|
|`mnt`|Mount points (filesystem)|
|`uts`|Hostname and domain name|
|`ipc`|Inter-process communication (queues, semaphores)|
|`user`|UID/GID mappings|
|`cgroup`|Visibility into the container's own cgroups|

---

## A lightweight demo of what Docker does under the hood

Let's install `debootstrap` to download the folder structure of a Linux distribution, then create a namespace-isolated environment from it on our machine.
**Note:** Remember, Docker is a Linux program, so these commands below should work only if you are in a Linux machine.

```bash
sudo apt-get install debootstrap -y
mkdir /tmp/debian
debootstrap stable /tmp/debian http://deb.debian.org/debian
cd /tmp/debian
```

Now let's use `unshare` for process isolation. We'll also need to set up the mount points:

```bash
sudo unshare --mount --uts --ipc --net --map-root-user --user --pid --fork chroot /tmp/debian bash

# mount these needed filesystem folders

mount -t proc none /proc
mount -t sysfs none /sys
mount -t tmpfs none /tmp
```

Now run `ps aux` and you'll see only the processes running inside your container:

```
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 05:03 ?        00:00:00 bash
root          27       1  0 06:28 ?        00:00:00 ps -ef
```

Just `bash` and `ps` — fully isolated from everything running on the host. ✅

Now test network isolation:

```bash
ip addr
```

```
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

No external network interfaces — because we isolated the network namespace with `--net`. ✅

Now `exit` back to your host terminal and run the same `unshare` command but **without** the `--net` flag. Inside the new container, run `ip addr` again — you'll now see the host machine's full network interface list, because we didn't isolate that namespace this time.

---

## Bonus: Resource limiting with cgroups

You could go further and test resource limiting with cgroups — capping memory and CPU. To do that, use something like `cgroup-tools`, or create cgroup entries manually:

```bash
sudo mkdir /sys/fs/cgroup/cpu/<my-awesome-group>
```

From there, you'd edit the appropriate files to set CPU limits, then associate the cgroup with the PID of your `unshare` process. This requires a deeper understanding of how Linux manages resources, but it's a rewarding rabbit hole, but don't worry if you don't want to do this right now, with Docker we can do it more easily.

Just in case you want to see this, I found this article that can help dip dive in how to manage resources with cgroups https://labs.iximiuz.com/tutorials/controlling-process-resources-with-cgroups

---

## Wrapping up

Docker built a polished CLI tool that wraps `unshare` and many other Linux primitives to deliver this application isolation mechanism. Remember: **Docker is a process — nothing more.** That process perceives itself as isolated on the machine, but it isn't really — the kernel is lying to it.

Now that you understand Docker's core, you honestly don't need a tutorial on `docker run` or `docker-compose` — that's all in the official docs, with tutorials and most-used commands ready to go. Check out the https://docs.docker.com/get-started/workshop.

### Key points to study next:

- How Docker uses volumes for data persistence
- Learn `docker-compose` — it's far better than managing raw Dockerfiles alone
- What a Docker image actually is

This article was just the starting point — Docker has a lot more to it. But as I mentioned, everything from here is well covered in the official Docker documentation. (Interestingly, the docs don't really explain, or I didn't find, how Docker does things under the hood using `unshare` and namespaces — which is exactly why this article exists.) I hope this helped you understand Docker at a deeper level.