#include <stdio.h>

int main(){
    setbuf(stdout, NULL);  // Auto-added for interactive I/O

    int a = 0;
    printf("%d", a);
    return 0;
}